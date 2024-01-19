from typing import List, Optional, Union
from pydantic import BaseModel
from treys import Deck, Card


class PokerAction(BaseModel):
    action: str
    amount: int


class PokerPlayer(BaseModel):
    stack: int
    bet: Union[int, None]
    cards: List[str]
    folded: bool
    lastAction: Optional[PokerAction] = None
    isAllIn: bool

    def do_bet(self, amount, isBlind):
        to_bet = amount
        if to_bet >= self.stack:
            to_bet = self.stack
            self.isAllIn = True
        self.stack = self.stack - to_bet
        self.lastAction = PokerAction(action="bet", amount=to_bet)
        self.bet = to_bet
        return to_bet



class PokerGamePlaying(BaseModel):
    players: List[Union[PokerPlayer, None]]
    dealer: int
    turn: int
    table: List[str]
    bank: int
    small_blind: int
    total_turns: int = 0

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

    
    def next_turn(self):
        self.turn = self.turn + 1
        if self.turn >= len(self.players):
            self.turn = 0
        if self.players[self.turn] == None:
            return self.next_turn()
        return self.turn


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
    game.players[turn].do_bet(game.small_blind*2, True)

def do_small_blind(game: PokerGamePlaying):
    turn = game.next_turn()  # next turn should do small blind
    player = game.players[turn]
    if (player):
        player.do_bet(game.small_blind, True)


def give_two_cards(game: PokerGamePlaying, deck: Deck):
    for player in game.players:
            if player:
                player.cards = [Card.int_to_str(card) for card in deck.draw(2)]

def start_round(game: PokerGamePlaying):
    game.total_turns += 1
    game.new_round_reset()
    game.next_dealer()
    deck = Deck()
    deck.shuffle()
    give_two_cards(game, deck)
    do_small_blind(game)
    do_big_blind(game)
    play_round(game)
    

def play_round(game: PokerGamePlaying):
    game.next_turn() 
    print(game.model_dump())
    pass



if __name__ == "__main__":
    game = createSimplePokerGamePlaying([None, None, None, "aaa", "vvv", None, None, None, None], 1500, 15)
    print(game.model_dump_json())
    for i in range(0, 12):
        print(game.next_dealer())
    start_round(game)
