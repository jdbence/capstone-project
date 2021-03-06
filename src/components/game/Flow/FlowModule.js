import { handleActions, createAction } from 'redux-actions';
import { random, findIndex, findLastIndex } from 'lodash';
import { isBot, getPlayerIndex, getNextPlayerID, isTeammate, getPlayerName } from 'utils/RoomUtil';
import { generateGame, getDrawPileIndex, getLastDiscard, getDiscardPileIndex, getPileCards, markLastInPile } from 'utils/GameUtil';
import { addCardsToPile, addDrawCardToPile, updateCards, cardsInPile } from 'utils/PileUtil';
import { getPlayableCard } from 'utils/RuleUtil';
import MsgUtil from 'utils/MsgUtil';
import Immutable from 'seamless-immutable';
import { uuid, findMe, setMe, createUser, setUser, createBot } from 'utils/UserUtil';

// ------------------------------------
// Constants
// ------------------------------------
const FLOW_STATE = 'flow';

// LOCAL
export const CREATE_ROOM = 'CREATE_ROOM';
export const JOIN_ROOM = 'JOIN_ROOM';
export const SETUP_ROOM = 'SETUP_ROOM';
export const SETUP_ROUND = 'SETUP_ROUND';
export const REPLENISH_DRAW_PILE = 'REPLENISH_DRAW_PILE';
export const USER_LOGIN = 'USER_LOGIN';
export const KICK_PLAYER = 'KICK_PLAYER';
export const ADD_BOT = 'ADD_BOT';
export const RECORD_ACTION = 'RECORD_ACTION';
export const MODE_CHANGED = 'MODE_CHANGED';

// REMOTE
export const ROOM_CHECK_READY = 'ROOM_CHECK_READY';
export const ROOM_START_ROUND = 'ROOM_START_ROUND';

// REMOTE SYNC
//export const PLAYER_DRAW_CARD = 'PLAYER_DRAW_CARD';
export const PLAYER_TURN_END = 'PLAYER_TURN_END';
export const UPDATE_GAME = 'UPDATE_GAME';
export const END_GAME = 'END_GAME';


// ------------------------------------
// Actions
// ------------------------------------
export const createRoom = createAction(CREATE_ROOM);
export const joinRoom = createAction(JOIN_ROOM);
export const setupRoomSuccess = createAction(`${SETUP_ROOM}_SUCCESS`);
export const setupRoomFail = createAction(`${SETUP_ROOM}_FAIL`);
export const setupRoundSuccess = createAction(`${SETUP_ROUND}_SUCCESS`);
export const updateGameSuccess = createAction(`${UPDATE_GAME}_SUCCESS`);
export const userLogin = createAction(USER_LOGIN);
export const playerTurnEndSuccess = createAction(`${PLAYER_TURN_END}_SUCCESS`);
export const endGame = createAction(END_GAME);
export const replenishDrawPile = createAction(REPLENISH_DRAW_PILE);
export const kickPlayer = createAction(KICK_PLAYER);
export const addBot = createAction(ADD_BOT);
export const recordActionSuccess = createAction(`${RECORD_ACTION}_SUCCESS`);
export const modeChanged = createAction(MODE_CHANGED);

// ------------------------------------
// ASYNC Actions
// ------------------------------------
export function setupRoom(roomID) {
  return function (dispatch, getState) {
    const { room, me } = getState()[FLOW_STATE];
    
    let nRoom = room.merge({
      isGameOver: false,
      status: 'WAITING',
      winner: ''
    });
    
    // join the room
    if(msgr.room != roomID){
      msgr.login(me.id);
      msgr.join(roomID, me)
        .then(() => {
          console.log(me, 'joined the room');
          dispatch(setupRoomSuccess({room: nRoom}));
        })
        .catch(() => {
          console.log('something went wrong');
          dispatch(setupRoomFail());
        });
    } else {
      dispatch(setupRoomSuccess({room: nRoom}));
    }
  };
}
export function setupRound() {
  return function (dispatch, getState) {
    const { room, me } = getState()[FLOW_STATE];
    const { deckID, deal, teamMode } = room;
    
    let players = room.players;
    let nRoom = room.merge({
      playerTurn: me.id,
      //players: players,
      isGameOver: false,
      status: 'STARTED',
      winner: '',
      actions: []
    });
    let nGame = generateGame(deckID, deal, teamMode, players, me.id);
    
    dispatch(setupRoundSuccess({room: nRoom, game: nGame, me:me}));
    
    // Update the layout
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };
}

export function updateGame(keys, value, sendRemote = false){
  return function (dispatch, getState) {
    //const { game } = getState()[FLOW_STATE];
    //let nGame = game.setIn(keys, value);
    //dispatch(updateGameSuccess({game: nGame}));
    dispatch(updateGameSuccess({keys: keys, value:value}));
    //TODO If sendRemote send nGame
  };
}

export function mergeGame(value, sendRemote = false){
  return function (dispatch, getState) {
    const { game } = getState()[FLOW_STATE];
    let nGame = game.merge(value, {deep: true});
    dispatch(updateGameSuccess({game: nGame}));
    //TODO If sendRemote send nGame
  };
}

export function playerTurnEnd(playerID) {
  return function (dispatch, getState) {
    const { players } = getState()[FLOW_STATE].room;
    const { cards, pileDefs } = getState()[FLOW_STATE].game;
    
    let nextPlayerID = getNextPlayerID(players, playerID);
    let pileID = getPlayerIndex(players, playerID);
    let gameOver = cardsInPile(cards, pileID) == 0;
    
    dispatch(playerTurnEndSuccess(nextPlayerID));
    
    // check if game is over
    if(gameOver){
      let winner = getPlayerName(players, playerID);
      dispatch(endGame(winner));
    } else {
      
      // replenish draw pile from discard pile
      pileID = getDrawPileIndex(pileDefs);
      if(cardsInPile(cards, pileID) == 0) {
        dispatch(replenishDrawPile());
      }
    
      // bot control
      if(isBot(players, nextPlayerID)){
        setTimeout(() => think(dispatch, getState, nextPlayerID), 1000 * random(2,4));
      }
    }
  };
}

export function recordAction(playerID, action){
  return function (dispatch, getState) {
    const { players, actions } = getState()[FLOW_STATE].room;
    const playerName = getPlayerName(players, playerID);
    
    dispatch(recordActionSuccess(actions.concat(Immutable([`${playerName} ${action}`]))));
  };
}

export const actions = {
};
  
// ------------------------------------
// Initial State
// ------------------------------------
let defaultMe = findMe();
if(!defaultMe){
  defaultMe = setMe(setUser(createUser('Jack')));
}
const msgr = new MsgUtil();
const defaultPlayers = [
  defaultMe,
  createBot(),
  createBot(),
  createBot()
];

const initialState = {
  game: {
    cards: [],
    piles: {},
    pileDefs: []
  },
  room: {
    players: defaultPlayers,
    deckID: 'ELM',
    teamMode: '2V2',
    deal: 7,
    playerTurn: 0,
    isGameOver: false,
    status: 'WAITING',
    winner: '',
    actions: []
  },
  me: defaultMe
};

const rLabel = function (label){
  return label + '$' + random(0, 99999);
};

const think = function (dispatch, getState, playerID) {
  const { pileDefs, piles, teams } = getState()[FLOW_STATE].game;
  const { players } = getState()[FLOW_STATE].room;
  const { id } = getState()[FLOW_STATE].me;
  //let nextPlayerID = getNextPlayerID(players, playerID);
  let { cards } = getState()[FLOW_STATE].game;
  
  //TODO: add bot logic
  let hostPile = getPlayerIndex(players, id);
  let playerPile = getPlayerIndex(players, playerID);
  let playerCards = getPileCards(cards, playerPile);
  let prevCard = getLastDiscard(cards, pileDefs);
  let playable = null;
  
  // match the last played card
  if(prevCard){
    playable = getPlayableCard(playerCards, prevCard, null);
  }
  // pick random first card
  else {
    playable = playerCards[random(0, playerCards.length - 1)];
  }
  
  // use playable card
  if(playable){
    let discard = getDiscardPileIndex(pileDefs);
    cards = addCardsToPile(cards, [playable], discard, false, true);
    // mark last card in discard pile
    cards = markLastInPile(cards, discard);
    dispatch(recordAction(playerID, `played ${playable.value} of ${playable.suit}s`));
  }
  // draw a card
  else {
    let draw = getDrawPileIndex(pileDefs);
    let flipped = !isTeammate(playerID, id, teams);
    cards = addDrawCardToPile(cards, piles, pileDefs, playerPile, flipped);
    // mark last card in draw pile
    cards = markLastInPile(cards, draw);
    dispatch(recordAction(playerID, 'drew a card'));
  }
        
  // mark last card in player hand
  cards = markLastInPile(cards, playerID);
  
  cards = updateCards(piles, cards, hostPile, players.length);
  dispatch(updateGame(['game', 'cards'], cards));
  
  // end bot turn
  dispatch(playerTurnEnd(playerID));
};

const handleUpdateGameSuccess = function (state, action) {
  //const { game } = state;
  
  if(action.payload.keys){
    const { keys, value } = action.payload;
    return state.setIn(keys, value);
  }
  return state.merge(action.payload, {deep: true});
    //let nGame = game.setIn(keys, value);
    //(state.merge(action.payload, {deep: true}))
};

const handleReplenishDrawPile = function (state) {
  const { pileDefs, piles } = state.game;
  const { players } = state.room;
  let { cards } = state.game;
  let discardPileID = getDiscardPileIndex(pileDefs);
  let drawPileID = getDrawPileIndex(pileDefs);
  let lastDiscardIndex = findLastIndex(cards, { pile: discardPileID });
  
  if(lastDiscardIndex != -1){
    cards = cards.map(function (c, index) {
      if(index < lastDiscardIndex){
        c = c.merge({
          pile: drawPileID,
          angleOffset: 0,
          flipped: true
        });
      }
      return c;
    });
  }
  
  cards = updateCards(piles, cards, drawPileID, players.length);
  return state.setIn(['game','cards'], cards);
};

const handleUserLogin = function (state, name, avatar) {
  let index = 0;
  // update storage
  setMe(setUser({...state.me, name:name, avatar:avatar}));
  // update state
  return state.setIn(['me','name'], name)
    .setIn(['me','avatar'], avatar)
    .setIn(['room','players',index,'name'], name)
    .setIn(['room','players',index,'avatar'], avatar);
};

const handleKickPlayer = function (state, index, bot) {
  return state
    .setIn(['room','players',index,'name'], 'Empty Slot')
    .setIn(['room','players',index,'avatar'], 7)
    .setIn(['room','players',index,'bot'], false);
};

const handleAddBot = function (state) {
  let empty = findIndex(state.room.players, {name: 'Empty Slot'});
  if(empty != -1){
    return state
      .setIn(['room','players',empty], createBot(state.room.players));
  }
  return state;
};

// ------------------------------------
// Reducer
// ------------------------------------
export const flowReducer = handleActions({
  [`${CREATE_ROOM}_SUCCESS`]: (state, action) => ({...state, room: action.payload}),
  [JOIN_ROOM]: (state, action) => ({...state, room: action.payload}),
  [`${SETUP_ROOM}_SUCCESS`]: (state, action) => (state.merge(action.payload, {deep: true})),
  [`${SETUP_ROUND}_SUCCESS`]: (state, action) => (state.merge(action.payload, {deep: true})),
  [`${UPDATE_GAME}_SUCCESS`]: (state, action) => handleUpdateGameSuccess(state, action),
  [`${PLAYER_TURN_END}_SUCCESS`]: (state, action) => state.setIn(['room','playerTurn'], action.payload),
  [END_GAME]: (state, action) => state.setIn(['room','isGameOver'], true).setIn(['room','winner'], action.payload),
  [REPLENISH_DRAW_PILE]: (state, action) => handleReplenishDrawPile(state),
  [USER_LOGIN]: (state, action) => handleUserLogin(state, action.payload.name, action.payload.avatar),
  [KICK_PLAYER]: (state, action) => handleKickPlayer(state, action.payload.index, action.payload.bot),
  [ADD_BOT]: (state, action) => handleAddBot(state),
  [`${RECORD_ACTION}_SUCCESS`]: (state, action) => state.setIn(['room','actions'], action.payload),
  [MODE_CHANGED]: (state, action) => state.setIn(['room','teamMode'], action.payload === 0 ? '2V2' : 'F4A')
}, initialState);

export default flowReducer;
