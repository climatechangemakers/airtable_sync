from datetime import date
from enum import Enum, unique
from typing import List, Mapping, NamedTuple, Optional, Tuple
import uuid
import csv

import click
import dateparser


@unique
class Audience(Enum):
    PERSONAL_NETWORK = "PERSONAL_NETWORK"
    POLICYMAKER = "POLICYMAKER"
    STAKEHOLDER = "STAKEHOLDER"
    PUBLIC = "PUBLIC"


@unique
class ActionSource(Enum):
    HOUR_OF_ACTION = "HOUR_OF_ACTION"
    ANYTIME_ACTION = "ANYTIME_ACTION"


@unique
class ActionIntent(Enum):
    ADVOCACY = "ADVOCACY"
    ELECTORAL = "ELECTORAL"


@unique
class Action(Enum):
    PHONE_CALLS = "PHONE_CALLS"
    CONSTITUENT_LETTERS = "CONSTITUENT_LETTERS"
    PERSONAL_MEETING = "PERSONAL_MEETING"
    SOCIAL_MEDIA_CONTACT = "SOCIAL_MEDIA_CONTACT"
    TOWN_HALL = "TOWN_HALL"
    LOBBY_MEETING = "LOBBY_MEETING"
    RELATIONAL_ORGANIZING_PERSONAL_MESSAGE = "RELATIONAL_ORGANIZING_PERSONAL_MESSAGE"
    RELATIONAL_ORGANIZING_SOCIAL_MEDIA = "RELATIONAL_ORGANIZING_SOCIAL_MEDIA"
    BLOG_POST = "BLOG_POST"
    ARTICLE_BY_REPORTER = "ARTICLE_BY_REPORTER"
    PODCAST = "PODCAST"
    TV_BROADCAST = "TV_BROADCAST"
    LETTER_TO_THE_EDITOR = "LETTER_TO_THE_EDITOR"
    OP_ED = "OP_ED"
    EDITORIAL = "EDITORIAL"


class RawAction(NamedTuple):
    email: str
    full_name: str
    date: date
    action: Action
    intent: ActionIntent
    count: int
    source: ActionSource
    audience: Audience
    other_form_inputs: Mapping
    form_response_id: str


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
    OTHER_OUTREACH_COUNT = "OTHER_OUTREACH_COUNT"
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
    FormField.OTHER_OUTREACH_COUNT: 'If you selected "Personal letters/emails or constituent comments or postcards," how many did you write?',
    FormField.ACTIONS_PUBLIC: "What action(s) did you take?",
    FormField.MEDIA_DESCRIPTION: "Can you provide links (preferred) or short descriptions of the media piece(s) checked above?",
    FormField.EMAIL: "Email Address",
    FormField.ACTION_SOURCE: "Source of action",
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
            ",".split(actions_policymaker_or_stakeholder_str)
            if actions_policymaker_or_stakeholder_str
            else []
        )

        actions_public_str = self._get_response_value(FormField.ACTIONS_PUBLIC)
        actions_public = ",".split(actions_public_str) if actions_public_str else []
        return [
            self._get_raw_action(form_action)
            for form_action in (actions_policymaker_or_stakeholder or actions_public)
        ]

    def _get_response_value(self, field: FormField):
        return self.form_response[_FORMFIELD_TO_FORM_COLUMN[field]]

    def _get_action_and_count(self, form_action: str) -> Tuple[Action, int]:
        # TODO(mike): Implement
        return (Action.ARTICLE_BY_REPORTER, 1)

    def _get_source(self):
        # TODO(mike): Implement.
        return ActionSource.HOUR_OF_ACTION

    def _get_audience(self):
        # TODO(mike): Implement.
        return Audience.PUBLIC

    def _get_raw_action(self, form_action: str) -> RawAction:
        action, action_count = self._get_action_and_count(form_action)
        return RawAction(
            email=self._get_response_value(FormField.EMAIL),
            full_name=self._get_response_value(FormField.FULL_NAME),
            date=dateparser.parse(
                self._get_response_value(FormField.ACTION_DATE)
            ).date(),
            action=action,
            intent=ActionIntent.ADVOCACY,
            count=action_count,
            source=self._get_source(),
            audience=self._get_audience(),
            # TODO(mike): Fill this in.
            other_form_inputs={},
            form_response_id=self.form_response_id,
        )

    def __str__(self):
        import pprint
        return pprint.pformat(self.form_response)

    # TODO(mike): schema changes
    # - remove 'PERSONAL_NETWORK'
    # - make action count nullable.


@click.command()
@click.argument('form_responses_csv')
def get_actions_from_form_responses(form_responses_csv):
    with open(form_responses_csv, "r") as infile:
        reader = csv.DictReader(infile)
        for record in reader:
            form_response = FormResponse(record)
            print(form_response)
            for raw_action in form_response.as_raw_actions():
                print(raw_action)


if __name__ == "__main__":
    get_actions_from_form_responses()
