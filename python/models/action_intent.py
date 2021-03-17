from enum import Enum, unique


@unique
class ActionIntent(Enum):
    ADVOCACY = "ADVOCACY"
    ELECTORAL = "ELECTORAL"
