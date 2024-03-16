import os
import sys

from .error import UserCommandError

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import math
import pprint
from typing import List, Optional
from pydantic import BaseModel
from utils import *
import random

PUBLIC_PATH = "../multigamews-frontend/public/"
DATA_PATH = "dixit_cards/"

CARDS_ON_HANDS = 5
PHASE_INITIAL = "initial"
PHASE1 = "phase1"
PHASE2 = "phase2"
PHASE3 = "phase3"
PHASE_RESULTS = "results"


class DixitResult(BaseModel):
    players_guessed_correctly: List[int]
    players_guessed_incorrectly: List[int]


class DixitPlayer(BaseModel):
    seat: int
    pts: int
    cards: List[str]
    acted: bool
    guess: Optional[str]

    def reset_acted_state(self):
        self.acted = False

    def reset_acted_state_and_guess(self):
        self.acted = False
        self.guess = None

    def set_acted(self):
        self.acted = True

    def pick_some_cards(self, deck, count):
        n = min(count, len(deck))
        self.cards.extend(deck[:n])
        del deck[:n]

    def take_chosen_card(self, chosen: str, original: bool):
        if not chosen in self.cards:
            raise UserCommandError(
                f"Card {chosen} is not found in user {self.model_dump()}",
                "missing card",
            )
        self.cards.remove(chosen)
        self.acted = True
        return card_handle(chosen, self.seat, original)


class TableCardHandle(BaseModel):
    card: str
    author: int
    original: bool
    votes: List[int] = []


def card_handle(card, author, original):
    return TableCardHandle(card=card, author=author, original=original)


def find_first_by_predicate(predicate, iterable):
    for item in iterable:
        if predicate(item):
            return item
    raise ValueError("No item found in the iterable that satisfies the predicate.")


class DixitGameState(BaseModel):
    status: str
    players: List[Optional[DixitPlayer]]
    current_player: int
    table: List[TableCardHandle]
    last_round_result: Optional[DixitResult]
    deck: List[str]

    def move_to_next_available_player(self):
        self.current_player += 1
        if self.current_player >= len(self.players):
            self.current_player = 0
        if self.players[self.current_player] == None:
            self.move_to_next_available_player()

    def give_cards_to_everyone(self):
        for player in self.players:
            if player != None:
                if len(player.cards) < CARDS_ON_HANDS:
                    player.pick_some_cards(
                        self.deck, CARDS_ON_HANDS - len(player.cards)
                    )

    def reset_users_acted(self):
        for player in self.players:
            if player != None:
                player.reset_acted_state()

    def reset_users_guessed(self):
        for player in self.players:
            if player != None:
                player.reset_acted_state_and_guess()

    def phase_1_to_2(self, seat, chosen):
        print("Phase 1 to 2")
        self.table.append(self.players[seat].take_chosen_card(chosen, True))
        self.status = PHASE2
        self.reset_users_acted()
        self.players[seat].set_acted()

    def are_all_users_acted(self):
        for player in self.players:
            if player != None and not player.acted:
                return False
        return True

    def are_all_users_guessed(self):
        for player in self.players:
            if player != None and (not player.guess) and (player.seat != self.current_player):
                print(f"Waiting for player {player.model_dump()}")
                return False
        return True

    def start_phase_1(self):
        self.reset_users_acted()
        self.table.clear()
        self.move_to_next_available_player()
        self.give_cards_to_everyone()
        self.status = PHASE1

    def start_phase_3(self):
        self.reset_users_guessed()
        random.shuffle(self.table)
        self.status = PHASE3

    def phase_2_act(self, seat, chosen):
        self.table.append(self.players[seat].take_chosen_card(chosen, False))
        if self.are_all_users_acted():
            self.start_phase_3()

    def phase_3_act(self, seat, chosen):
        player: DixitPlayer = self.players[seat]
        player.guess = chosen
        if self.are_all_users_guessed():
            self.finalize_phase()

    def finalize_phase(self):
        self.status = PHASE_RESULTS
        self.last_round_result = DixitResult(players_guessed_correctly=[], players_guessed_incorrectly=[])
        for user in [user for user in self.players if user != None and user.seat != self.current_player]:
            guess = user.guess
            card = find_first_by_predicate(lambda x: x.card == guess, self.table)
            card.votes.append(user.seat)
            if card.original:
                print(f"User {user.seat} guessed right")
                user.pts += 2
                self.last_round_result.players_guessed_correctly.append(user.seat)
            else:
                print(f"User {user.seat} guessed wrong, user {card.author} wins")
                self.players[card.author].pts += 1
                self.last_round_result.players_guessed_incorrectly.append(user.seat)
        self.reset_users_guessed()
        print(">>>> RESULT PHASE IN DIXIT:")
        print(f"{self.model_dump()}")


class DixitAction(BaseModel):
    seat: int
    chosen: str


def init_dixit_game_state(max_players: int):
    state = DixitGameState(
        status=PHASE_INITIAL,
        players=[None] * max_players,
        table=[],
        last_round_result=None,
        deck=[],
        current_player=0,
    )
    state.deck = [
        os.path.basename(file_path)
        for file_path in list_files_sync(PUBLIC_PATH + DATA_PATH)
    ]
    random.shuffle(state.deck)
    return state


def start(state: DixitGameState, players: List[str]):
    for i in range(0, len(state.players)):
        if players[i] != None:
            state.players[i] = DixitPlayer(
                seat=i, pts=0, cards=[], acted=False, guess=None
            )
    state.start_phase_1()
    return state


def process_user_action(state: DixitGameState, action: DixitAction):
    print(f"User action: {action}")
    if state.players[action.seat] == None:
        raise UserCommandError(f"User {action.seat} does not exist", "wrong user")
    if state.status == PHASE1:
        if state.current_player != action.seat:
            raise UserCommandError(
                f"Action {action.model_dump()} is not allowed for this user in phase 1",
                "wrong user",
            )
        state.phase_1_to_2(action.seat, action.chosen)
    elif state.status == PHASE2:
        if state.players[action.seat].acted:
            raise UserCommandError(f"User {action.seat} already acted", "wrong user")
        state.phase_2_act(action.seat, action.chosen)
    elif state.status == PHASE3:
        if state.players[action.seat].guess:
            raise UserCommandError(f"User {action.seat} already guessed", "wrong user")
        state.phase_3_act(action.seat, action.chosen)
    else:
        raise UserCommandError(f"Unnown phase of the game", "wrong phase")


if __name__ == "__main__":
    game = init_dixit_game_state(9)
    game = start(game, [None, None, None, "aaa", "vvv", None, None, None, None])
    printer = pprint.PrettyPrinter(indent=4)
    printer.pprint(game.model_dump())
