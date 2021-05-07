import csv
import logging
from datetime import datetime
from typing import NamedTuple, Optional

import click
from dateutil.parser import isoparse

LOG = logging.getLogger(__name__)


class LumaAttendanceRecord(NamedTuple):
    event_id: str
    email: str
    signedup_at: Optional[datetime]
    did_join_event: bool


class RawLumaAttendanceRecord(NamedTuple):
    email: str
    has_joined_event: str


@click.command()
@click.argument("luma_attendance_filename")
@click.argument("event_id")
@click.argument("output_filename")
def prepare_for_luma_attendance_table(
    luma_attendance_filename, event_id, output_filename
):
    """Generate a csv that can be COPYed into the ccm-db `luma_attendance` table

    LUMA_ATTENDANCE_FILENAME is a guest list csv downloaded from the luma "manage event" page.
    See an example here:\n
    https://docs.google.com/spreadsheets/d/1p5WGBikhCEZFbh92NOZW-kOq5xQsO-wlF19BBgLOMTQ/edit#gid=1036859645

    EVENT_ID is a foreign key to the `hoa_event.id` field.

    To copy `output_filename` into ccm-db:

    psql -h ccm-db.c51ekbqkhdej.us-west-2.rds.amazonaws.com -U ccm_readwrite -d postgres -c "\copy luma_attendance FROM <output_filename> WITH (FORMAT csv, HEADER true)"
    """
    with open(luma_attendance_filename, "r") as infile:
        with open(output_filename, "w") as outfile:
            reader = csv.DictReader(infile)
            writer = csv.DictWriter(outfile, LumaAttendanceRecord._fields)
            writer.writeheader()
            for record in reader:
                created_at = record.get("created_at")
                luma_attendance_record = LumaAttendanceRecord(
                    event_id=event_id,
                    email=record["email"],
                    signedup_at=created_at and isoparse(created_at),
                    did_join_event=record["has_joined_event"] == "Yes",
                )
                writer.writerow(luma_attendance_record._asdict())


@click.command()
@click.argument("zoom_registration_report_filename")
@click.argument("luma_attendance_filename")
def convert_zoom_registration_report_to_luma_attendance(
    zoom_registration_report_filename, luma_attendance_filename
):
    """Convert a Zoom registration report to a raw luma attendance file.

    The output file can be passed into `prepare_for_luma_attendance_table.
    """
    with open(zoom_registration_report_filename, "r") as infile:
        with open(luma_attendance_filename, "w") as outfile:
            reader = csv.DictReader(infile)
            writer = csv.DictWriter(outfile, RawLumaAttendanceRecord._fields)
            writer.writeheader()
            for record in reader:
                raw_luma_attendance_record = RawLumaAttendanceRecord(
                    email=record["Email"],
                    has_joined_event="Yes",
                )
                writer.writerow(raw_luma_attendance_record._asdict())


@click.group()
def cli():
    pass


cli.add_command(prepare_for_luma_attendance_table)
cli.add_command(convert_zoom_registration_report_to_luma_attendance)


if __name__ == "__main__":
    cli()
