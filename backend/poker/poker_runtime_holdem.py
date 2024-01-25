import math
from typing import List, Optional, Union
from pydantic import BaseModel
from treys import Deck, Card, Evaluator, evaluator
import pprint


class UserCommandError(Exception):
    def __init__(self, message, error_type):
        # Call the base class constructor with the parameters it needs
        super().__init__(message)

        # Now for your custom code...
        self.error_type = error_type


class PokerComment(BaseModel):
    text: str
    seats: List[int]


class PokerAction(BaseModel):
    action: str
    amount: int = 0


class UserResponse(BaseModel):
    action: PokerAction
    seat: int


class PokerPlayer(BaseModel):
    stack: int
    bet: Union[int, None]
    cards: List[str]
    folded: bool
    lastAction: Optional[PokerAction] = None
    isAllIn: bool
    acted: bool = False

    def do_bet_action(self, amount: int, action, isBlind=False):
        to_bet = amount
        if to_bet >= self.stack:
            to_bet = self.stack
            self.isAllIn = True
        self.stack = self.stack - to_bet
        self.lastAction = PokerAction(action=action, amount=to_bet)
        self.bet += to_bet
        return to_bet

    def do_bet(self, amount, isBlind=False):
        return self.do_bet_action(amount, "bet", isBlind=isBlind)

    def do_call(self, amount):
        return self.do_bet_action(amount, "call")

    def do_raise(self, amount):
        return self.do_bet_action(amount, "raise")

    def do_fold(self, show_cards=False):
        self.folded = True


class VictoryRecord(BaseModel):
    folded: bool
    winners: List[int]
    won: int
    combination: Optional[str]


class PokerGamePlaying(BaseModel):
    players: List[Union[PokerPlayer, None]]
    dealer: int
    turn: int
    expected_actions: List[PokerAction] = []
    table: List[str]
    bank: int
    small_blind: int
    total_turns: int = 0
    last_round_victory: Optional[VictoryRecord] = None
    comments: List[PokerComment] = []

    def comment(self, text, seats=[]):
        """Add new comment to comments list"""
        if isinstance(seats, int):
            seats = [seats]
        comment = PokerComment(text=text, seats=seats)
        self.comments.append(comment)

    def next_dealer(self):
        self.dealer = self.dealer + 1
        if self.dealer >= len(self.players):
            self.dealer = 0
        if self.players[self.dealer] == None:
            return self.next_dealer()
        return self.dealer

    def new_round_reset(self):
        self.bank = 0
        self.turn = self.dealer
        self.table = []
        for player in self.players:
            if player:
                player.cards = []
                player.folded = False
                player.isAllIn = False
                player.bet = 0

    def next_turn(self):
        self.turn = self.turn + 1
        if self.turn >= len(self.players):
            self.turn = 0
        if self.players[self.turn] == None:
            return self.next_turn()
        return self.turn

    def next_not_folded_turn(self):
        self.turn = self.turn + 1
        if self.turn >= len(self.players):
            self.turn = 0
        if self.players[self.turn] == None or self.players[self.turn].folded:
            return self.next_not_folded_turn()
        return self.turn

    def not_folded_seat_index(self):
        return [
            i
            for i, item in enumerate(self.players)
            if (item is not None and not item.folded)
        ]


def createSimplePokerGamePlaying(playersMap, buyIn, blind):
    players = [
        None
        if not player
        else PokerPlayer(
            stack=buyIn,
            bet=None,
            cards=[],
            folded=False,
            lastAction=None,
            isAllIn=False,
            acted=False,
        )
        for player in playersMap
    ]
    dealer = 0
    turn = 0
    table = []
    bank = 0
    return PokerGamePlaying(
        players=players,
        dealer=dealer,
        turn=turn,
        table=table,
        bank=bank,
        small_blind=blind,
    )


def do_big_blind(game: PokerGamePlaying):
    # assuming that previous turn was small blind
    turn = game.next_turn()
    game.comment(f"User $$ small blind {game.small_blind * 2}", game.turn)
    game.players[turn].do_bet(game.small_blind * 2, True)


def do_small_blind(game: PokerGamePlaying):
    turn = game.next_turn()  # next turn should do small blind
    game.comment(f"User $$ big blind {game.small_blind}", game.turn)
    player = game.players[turn]
    if player:
        player.do_bet(game.small_blind, True)


def draw_cards(deck, number):
    """Take n cards from the deck"""
    return [Card.int_to_str(card) for card in deck.draw(number)]


def give_two_cards(game: PokerGamePlaying, deck: Deck):
    """Draw hole cards to everybody"""
    for player in game.players:
        if player:
            player.cards = draw_cards(deck, 2)


def game_start(game, deck):
    start_round(game, deck)
    options_for_next_round(game)


def start_round(game: PokerGamePlaying, deck: Deck):
    game.total_turns += 1
    game.new_round_reset()
    game.next_dealer()
    deck.shuffle()
    give_two_cards(game, deck)
    do_small_blind(game)
    do_big_blind(game)
    game.comment("pre-flop")
    game.next_turn()


def process_user_action(game: PokerGamePlaying, action: PokerAction):
    def isAllowedAction(action):
        for act in game.expected_actions:
            if act.action == action.action:
                return act
        return False

    def verifyAction(action: PokerAction):
        allowed = isAllowedAction(action)
        if not allowed:
            raise UserCommandError(
                f"Action {action.model_dump()} is not allowed, allowed: {game.expected_actions}",
                "wrong action",
            )
        min = allowed.amount
        if min >= 0 and action.amount < min:
            raise UserCommandError(
                f"Action {action.model_dump()} is less than minimal allowed: {min}",
                "wrong amound",
            )

    player = game.players[game.turn]
    verifyAction(action)
    player.lastAction = action
    if action.action == "call":
        called = player.do_call(action.amount)
        game.comment(f"User $$ calls {called}", game.turn)
    elif action.action == "raise":
        raised = player.do_raise(action.amount)
        game.comment(f"User $$ raises {raised}", game.turn)
    elif action.action == "bet":
        bet = player.do_bet(action.amount)
        game.comment(f"User $$ bets {bet}", game.turn)
    elif action.action in ["fold", "fold_show"]:
        player.do_fold(show_cards=action.action == "fold_show")
    elif action.action == "check":
        game.comment(f"User $$ checks", game.turn)
        pass
    else:
        raise UserCommandError(f"Unknown command {action.action}", "unknown command")

    player.acted = True


def win_round_start_next(
    game: PokerGamePlaying, winners_indices, winner_combination, deck
):
    win_game(game, winners_indices, winner_combination)
    start_round(game, deck)


def win_game(game: PokerGamePlaying, winners_indices, winner_combination):
    """Give prizes to the winners"""
    win = int(game.bank / len(winners_indices))
    for winner in winners_indices:
        player = game.players[winner]
        player.stack += int(win)
        game.comment(f"User $$ wins {win}!", winner)
    game.last_round_victory = VictoryRecord(
        folded=True if winner_combination == None else False,
        winners=winners_indices,
        won=win,
        combination=winner_combination,
    )


def find_max_bet(game, players_left):
    """Find required bet for any player to proceed to the next betting round"""
    bet = 0
    for player_seat in players_left:
        player = game.players[player_seat]
        bet = max(bet, player.bet)
    return bet


def bettinground_end_condition(game: PokerGamePlaying, players_left, max_bet):
    """Check if betting round should be ended now
    True - end betting
    False - continue betting"""
    if len(players_left) < 2:  # everyone folded
        return True

    for player_seat in players_left:
        player = game.players[player_seat]
        if not player.acted:
            return False  # at least one player did not say a word yet

        # check max bet
        if player.bet < max_bet and not player.isAllIn:
            # player should call new bet or fold
            return False
    return True


def end_bettinground(game: PokerGamePlaying):
    """End betting round by:
    - move all money from bets to the bank
    - reset player's acted status"""
    for player in game.players:
        if player is None:
            continue

        # take player's bets, even folded
        game.bank += player.bet
        player.bet = 0

        # reset player's action
        player.acted = False


def showdown(game: PokerGamePlaying):
    """Showdown:
    - decide who is the winner
    - call win_game()"""

    ev = Evaluator()

    def evaluate_cards(board, cards: List[str]):
        hand = [Card.new(x) for x in cards]
        return ev.evaluate(hand, board)

    game.comment("showdown")

    board = [Card.new(x) for x in game.table]
    players = {seat: game.players[seat].cards for seat in game.not_folded_seat_index()}
    results = {seat: evaluate_cards(board, cards) for (seat, cards) in players.items()}
    print(game.table)
    print(players)
    print(results)
    sorted_results = [(seat, result) for seat, result in results.items()]
    sorted_results.sort(key=lambda item: item[1])
    winner_number = sorted_results[0][1]
    print(sorted_results)
    winners = [
        sorted_result[0]
        for sorted_result in sorted_results
        if sorted_result[1] == winner_number
    ]
    return VictoryRecord(
        folded=False,
        winners=winners,
        won=0,
        combination=ev.class_to_string(ev.get_rank_class(evaluate_cards(board, players[winners[0]]))),
    )


def next_bettinground(game: PokerGamePlaying, deck: Deck):
    """Start next betting round OR finalize round,
    return results"""
    if len(game.table) == 0:
        # flop
        game.comment("flop")
        game.table = draw_cards(deck, 3)
    elif len(game.table) == 3:
        # turn (after flop)
        game.comment("turn")
        game.table.append(*draw_cards(deck, 1))
    elif len(game.table) == 4:
        # last round
        game.comment("river")
        game.table.append(*draw_cards(deck, 1))
    else:
        # ohoho, we came so far
        return showdown(game)


def options_for_next_round(game: PokerGamePlaying):
    player = game.players[game.turn]
    players_left = game.not_folded_seat_index()
    bet = find_max_bet(game, players_left)
    if player.bet < bet:
        game.expected_actions = [
            PokerAction(action="call", amount=bet - player.bet),
            PokerAction(action="raise", amount=(bet - player.bet) * 2),
            PokerAction(action="fold", amount=-1),
            PokerAction(action="fold_show", amount=-1),
        ]
    else:
        game.expected_actions = [
            PokerAction(action="check", amount=0),
            PokerAction(action="bet", amount=game.small_blind * 2),
            PokerAction(action="fold", amount=0),
            PokerAction(action="fold_show", amount=0),
        ]


def game_next(game: PokerGamePlaying, deck: Deck, response: UserResponse):
    """Execute next game steps by reading and validating user action"""
    if game.turn != response.seat:
        raise UserCommandError(
            f"Expected command from {game.turn}, got from {response.seat}", "turn order"
        )
    action = response.action
    process_user_action(game, action)
    players_left = game.not_folded_seat_index()
    bet = find_max_bet(game, players_left)
    if bettinground_end_condition(game, players_left, bet):
        end_bettinground(game)
        result = next_bettinground(game, deck)
        if result:
            win_round_start_next(game, result.winners, result.combination, deck)
    if len(players_left) < 2:
        win_round_start_next(
            game,
            players_left,
            None,
            deck
        )
    game.next_not_folded_turn()
    options_for_next_round(game)


def create_deck():
    return Deck()


if __name__ == "__main__":
    game = createSimplePokerGamePlaying(
        [None, None, None, "aaa", "vvv", None, None, None, None], 1500, 15
    )
    print(game.model_dump_json())
    for i in range(0, 12):
        print(game.next_dealer())
    deck = Deck()
    game_start(game, deck=deck)
    printer = pprint.PrettyPrinter(indent=4)
    printer.pprint(game.model_dump())
    game_next(
        game, deck, UserResponse(action=PokerAction(action="call", amount=15), seat=3)
    )
    game_next(game, deck, UserResponse(action=PokerAction(action="check"), seat=4))
    game_next(game, deck, UserResponse(action=PokerAction(action="check"), seat=3))
    game_next(
        game, deck, UserResponse(action=PokerAction(action="bet", amount=100), seat=4)
    )
    game_next(
        game, deck, UserResponse(action=PokerAction(action="call", amount=100), seat=3)
    )
    game_next(game, deck, UserResponse(action=PokerAction(action="check"), seat=4))
    game_next(game, deck, UserResponse(action=PokerAction(action="check"), seat=3))
    game_next(game, deck, UserResponse(action=PokerAction(action="check"), seat=4))
    game_next(game, deck, UserResponse(action=PokerAction(action="check"), seat=3))
    printer.pprint(game.model_dump())
