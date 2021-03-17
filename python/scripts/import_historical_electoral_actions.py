import csv
import json
import pprint
import logging
import uuid
from datetime import date
from enum import Enum, unique
from typing import List, Mapping, NamedTuple, Optional, Tuple

import click
import dateparser

from models.action import Action
from models.action_intent import ActionIntent

LOG = logging.getLogger(__name__)


@unique
class Audience(Enum):
    POLICYMAKER = "POLICYMAKER"
    STAKEHOLDER = "STAKEHOLDER"
    PUBLIC = "PUBLIC"
    OTHER = "OTHER"


@unique
class ActionSource(Enum):
    HOUR_OF_ACTION = "HOUR_OF_ACTION"
    ANYTIME_ACTION = "ANYTIME_ACTION"


class RawAction(NamedTuple):
    email: str
    full_name: str
    date: date
    action: Action
    intent: ActionIntent
    count: Optional[int]
    source: ActionSource
    audience: Optional[Audience]
    other_form_inputs: Mapping
    form_response_id: str

    def to_csv_record(self):
        return {
            # TODO(mike): Do this sanitization somewhere else
            "email": self.email.lower(),
            "full_name": self.full_name.strip(),
            "date": self.date.strftime("%Y-%m-%d"),
            "action": self.action.value,
            "intent": self.intent.value,
            "count": self.count,
            "source": self.source.value,
            "audience": self.audience and self.audience.value,
            "other_form_inputs": json.dumps(self.other_form_inputs),
            "form_response_id": self.form_response_id,
        }


@unique
class HistoricalElectoralActionField(Enum):
    EMAIL = "EMAIL"
    NAME = "NAME"
    ACTION_DATE = "ACTION_DATE"
    ACTION_SOURCE = "ACTION_SOURCE"
    ACTION = "ACTION"
    ACTION_COUNT = "ACTION_COUNT"


_HISTORICAL_ELECTORAL_ACTION_FIELD_TO_COLUMN = {
    HistoricalElectoralActionField.EMAIL: "Email",
    HistoricalElectoralActionField.NAME: "Name",
    HistoricalElectoralActionField.ACTION_DATE: "Action Date",
    HistoricalElectoralActionField.ACTION_SOURCE: "Action Source",
    HistoricalElectoralActionField.ACTION: "Action",
    HistoricalElectoralActionField.ACTION_COUNT: "Action Count",
}

_ACTION_FORM_VALUE_TO_ACTION = {
    "PHONE BANKING": Action.PHONE_BANKING,
    "LETTER WRITING": Action.CONSTITUENT_CONTACT,
    "TEXT BANKING": Action.TEXT_BANKING,
    "FUNDRAISING": Action.FUNDRAISING,
    "RELATIONAL ORGANIZING (SOCIAL MEDIA)": Action.RELATIONAL_ORGANIZING_SOCIAL_MEDIA,
    "INSTAGRAM DM": Action.RELATIONAL_ORGANIZING_SOCIAL_MEDIA,
}


class HistoricalElectoralAction:
    def __init__(self, record: Mapping[str, str]):
        self.record = record
        self.generated_form_response_id = uuid.uuid4().hex

    def as_raw_action(self) -> RawAction:
        action = self._get_action()
        return RawAction(
            email=self._get_response_value(HistoricalElectoralActionField.EMAIL),
            full_name=self._get_response_value(HistoricalElectoralActionField.NAME),
            date=dateparser.parse(
                self._get_response_value(HistoricalElectoralActionField.ACTION_DATE)
            ).date(),
            action=action,
            intent=ActionIntent.ELECTORAL,
            count=self._get_action_count(),
            source=ActionSource.HOUR_OF_ACTION,
            audience=Audience.OTHER if action == Action.OTHER else Audience.PUBLIC,
            other_form_inputs={},
            form_response_id=self.generated_form_response_id,
        )

    def _get_response_value(self, field: HistoricalElectoralActionField):
        return self.record[_HISTORICAL_ELECTORAL_ACTION_FIELD_TO_COLUMN[field]]

    def _get_action(self) -> Action:
        form_action_value = self._get_response_value(
            HistoricalElectoralActionField.ACTION
        )
        action = _ACTION_FORM_VALUE_TO_ACTION.get(form_action_value.upper())
        if action is not None:
            return action
        LOG.warning(
            "Action form value not found, returning {Action.OTHER}: "
            f"{form_action_value}"
        )
        return Action.OTHER

    def _get_action_count(self):
        action_count_value = self._get_response_value(
            HistoricalElectoralActionField.ACTION_COUNT
        )
        if action_count_value != "":
            return int(action_count_value)
        return None

    def __str__(self):
        return pprint.pformat(self.record)


@click.command()
@click.argument("historical_electoral_actions_filename")
@click.argument("output_filename")
def get_historical_electoral_actions(
    historical_electoral_actions_filename, output_filename
):
    """Generate a csv that can be COPYed into the ccm-db `actions_raw` table

    FORM_RESPONSES_FILENAME is a csv downloaded from the advocacy tracking
    responses Google sheet
    (https://docs.google.com/spreadsheets/d/10tGd0De-gqlMEkZuB9orwaHGIRy0zDl8vSCq5wEj1FI/edit#gid=1628979061)

    To copy `output_filename` into ccm-db:\n
    psql -h ccm-db.c51ekbqkhdej.us-west-2.rds.amazonaws.com -U ccm_readwrite
    -d postgres -c "\copy actions_raw FROM <output_filename> WITH (FORMAT
    csv, HEADER true)"
    """
    with open(historical_electoral_actions_filename, "r") as infile:
        with open(output_filename, "w") as outfile:
            reader = csv.DictReader(infile)
            writer = csv.DictWriter(outfile, RawAction._fields)
            writer.writeheader()
            for record in reader:
                historical_electoral_action = HistoricalElectoralAction(record)
                writer.writerow(
                    historical_electoral_action.as_raw_action().to_csv_record()
                )


if __name__ == "__main__":
    get_historical_electoral_actions()
