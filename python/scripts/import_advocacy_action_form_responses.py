import csv
import json
import logging
import pprint
import uuid
from datetime import date
from enum import Enum, unique
from typing import List, Mapping, NamedTuple, Optional

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
class FormField(Enum):
    TIMESTAMP = "TIMESTAMP"
    FULL_NAME = "FULL_NAME"
    ACTION_DATE = "ACTION_DATE"
    AUDIENCE = "AUDIENCE"
    WAS_FACILITATOR = "WAS_FACILITATOR"
    AUDIENCE_NAMES = "AUDIENCE_NAMES"
    ACTIONS_POLICYMAKER_OR_STAKEHOLDER = "ACTIONS_POLICYMAKER_OR_STAKEHOLDER"
    PHONE_CALL_COUNT = "PHONE_CALL_COUNT"
    CONSTITUENT_CONTACT_COUNT = "CONSTITUENT_CONTACT_COUNT"
    ACTIONS_PUBLIC = "ACTIONS_PUBLIC"
    MEDIA_DESCRIPTION = "MEDIA_DESCRIPTION"
    EMAIL = "EMAIL"
    ACTION_SOURCE = "ACTION_SOURCE"


_FORMFIELD_TO_FORM_COLUMN = {
    FormField.TIMESTAMP: "Timestamp",
    FormField.FULL_NAME: "Full Name",
    FormField.ACTION_DATE: "Action Date",
    FormField.AUDIENCE: "Who did you reach out to? (NOTE: If multiple, please re-submit form with details from second action!)",
    FormField.WAS_FACILITATOR: "Were you the facilitator for an Hour of Action breakout room in Zoom?",
    FormField.AUDIENCE_NAMES: "What is the name of the policymaker(s) or stakeholder(s) you contacted?",
    FormField.ACTIONS_POLICYMAKER_OR_STAKEHOLDER: "What did you do?",
    FormField.PHONE_CALL_COUNT: 'If you selected "Phone calls", how many did you make?',
    FormField.CONSTITUENT_CONTACT_COUNT: 'If you selected "Personal letters/emails or constituent comments or postcards," how many did you write?',
    FormField.ACTIONS_PUBLIC: "What action(s) did you take?",
    FormField.MEDIA_DESCRIPTION: "Can you provide links (preferred) or short descriptions of the media piece(s) checked above?",
    FormField.EMAIL: "Email Address",
    FormField.ACTION_SOURCE: "Source of action",
}

_AUDIENCE_FORM_VALUE_TO_AUDIENCE = {
    "Policymaker (e.g. congressperson, local public official, etc.)": Audience.POLICYMAKER,
    "Public (personal network e.g. friends, family, coworkers, etc.; or the broader public via blog post, media, etc.)": Audience.PUBLIC,
    "Stakeholder (e.g. nonprofit, company, organization, etc.)": Audience.STAKEHOLDER,
    "No outreach yet, but I'm ready to start a climate conversation with my friends, family, and/or followers using my personalized talking points": None,
}

_ACTION_FORM_VALUE_TO_ACTION = {
    "Phone calls": Action.PHONE_CALLS,
    "Personal letters/emails or constituent comments or postcards": Action.CONSTITUENT_CONTACT,
    "Personal meeting": Action.PERSONAL_MEETING,
    "Social media interactions (contact via Twitter or Facebook or other social media platform)": Action.SOCIAL_MEDIA_CONTACT,
    "Town hall": Action.TOWN_HALL,
    "Lobby meeting": Action.LOBBY_MEETING,
    "Personal text/call/message -- to someone in your personal network": Action.RELATIONAL_ORGANIZING_PERSONAL_MESSAGE,
    "Social media post -- wrote and shared to your network": Action.RELATIONAL_ORGANIZING_SOCIAL_MEDIA,
    "Blog post (e.g. Medium, LinkedIn) -- wrote and shared to your network": Action.BLOG_POST,
    "Article written by a reporter -- was interviewed or quoted in": Action.ARTICLE_BY_REPORTER,
    "Podcast -- was interviewed in or hosted": Action.PODCAST,
    "TV broadcast -- was interviewed in or hosted": Action.TV_BROADCAST,
    "Letter to the editor -- wrote or signed": Action.LETTER_TO_THE_EDITOR,
    "Op-ed -- wrote or signed": Action.OP_ED,
    "Editorial -- wrote or signed": Action.EDITORIAL,
}


class FormResponse:
    def __init__(self, form_response: Mapping[str, str]):
        self.form_response = form_response
        self.form_response_id = uuid.uuid4().hex

    def as_raw_actions(self) -> List[RawAction]:
        actions_policymaker_or_stakeholder_str = self._get_response_value(
            FormField.ACTIONS_POLICYMAKER_OR_STAKEHOLDER
        )
        actions_policymaker_or_stakeholder = (
            [
                self._get_action(action_str.strip())
                for action_str in actions_policymaker_or_stakeholder_str.split(",")
            ]
            if actions_policymaker_or_stakeholder_str
            else []
        )

        actions_public_str = self._get_response_value(FormField.ACTIONS_PUBLIC)
        actions_public = (
            [
                self._get_action(action_str.strip())
                for action_str in actions_public_str.split(",")
            ]
            if actions_public_str
            else []
        )
        actions = actions_policymaker_or_stakeholder or actions_public or [Action.OTHER]
        return [self._get_raw_action(action) for action in actions]

    def _get_response_value(self, field: FormField):
        return self.form_response[_FORMFIELD_TO_FORM_COLUMN[field]]

    def _get_action(self, form_action_value: str) -> Action:
        action = _ACTION_FORM_VALUE_TO_ACTION.get(form_action_value)
        if action is not None:
            return action
        LOG.warning(
            "Action form value not found, returning {Action.OTHER}: "
            f"{form_action_value}"
        )
        return Action.OTHER

    def _get_action_count(self, action: Action) -> Optional[int]:
        if self._get_audience() not in {Audience.POLICYMAKER, Audience.STAKEHOLDER}:
            return None
        if action == Action.PHONE_CALLS:
            return int(self._get_response_value(FormField.PHONE_CALL_COUNT))
        if action == Action.CONSTITUENT_CONTACT:
            return int(self._get_response_value(FormField.CONSTITUENT_CONTACT_COUNT))
        return None

    def _get_source(self):
        # TODO(mike): Handle Anytime actions.
        return ActionSource.HOUR_OF_ACTION

    def _get_audience(self) -> Optional[Audience]:
        audience_form_value = self._get_response_value(FormField.AUDIENCE)
        if audience_form_value in _AUDIENCE_FORM_VALUE_TO_AUDIENCE:
            return _AUDIENCE_FORM_VALUE_TO_AUDIENCE[audience_form_value]
        LOG.warning(
            f"Audience form value not found, returning {Audience.OTHER}: "
            f"{audience_form_value}"
        )
        return Audience.OTHER

    def _get_raw_action(self, action: Action) -> RawAction:
        return RawAction(
            email=self._get_response_value(FormField.EMAIL),
            full_name=self._get_response_value(FormField.FULL_NAME),
            date=dateparser.parse(
                self._get_response_value(FormField.ACTION_DATE)
            ).date(),
            action=action,
            intent=ActionIntent.ADVOCACY,
            count=self._get_action_count(action),
            source=self._get_source(),
            audience=self._get_audience(),
            # TODO(mike): Fill this in.
            other_form_inputs={},
            form_response_id=self.form_response_id,
        )

    def __str__(self):
        return pprint.pformat(self.form_response)


@click.command()
@click.argument("form_responses_filename")
@click.argument("output_filename")
def get_actions_from_form_responses(form_responses_filename, output_filename):
    """Generate a csv that can be COPYed into the ccm-db `actions_raw` table

    FORM_RESPONSES_FILENAME is a csv downloaded from the advocacy tracking responses Google sheet
    (https://docs.google.com/spreadsheets/d/10tGd0De-gqlMEkZuB9orwaHGIRy0zDl8vSCq5wEj1FI/edit#gid=1628979061)

    To copy `output_filename` into ccm-db:\n
    psql -h ccm-db.c51ekbqkhdej.us-west-2.rds.amazonaws.com -U ccm_readwrite -d postgres -c "\copy actions_raw FROM <output_filename> WITH (FORMAT csv, HEADER true)"
    """
    with open(form_responses_filename, "r") as infile:
        with open(output_filename, "w") as outfile:
            reader = csv.DictReader(infile)
            writer = csv.DictWriter(outfile, RawAction._fields)
            writer.writeheader()
            for record in reader:
                form_response = FormResponse(record)
                for raw_action in form_response.as_raw_actions():
                    writer.writerow(raw_action.to_csv_record())


if __name__ == "__main__":
    get_actions_from_form_responses()
