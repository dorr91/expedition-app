import Redux from 'redux'
import {connect} from 'react-redux'

import Search, {SearchStateProps, SearchDispatchProps} from './Search'

import {toPrevious, toCard} from '../actions/Card'
import {changeSettings} from '../actions/Settings'
import {viewQuest} from '../actions/Quest'
import {login} from '../actions/User'
import {fetchQuestXML, search, subscribe} from '../actions/Web'
import {AppState, SearchSettings, UserState} from '../reducers/StateTypes'
import {QuestDetails} from '../reducers/QuestTypes'


const mapStateToProps = (state: AppState, ownProps: SearchStateProps): SearchStateProps => {
  return {
    ...state.search,
    numPlayers: state.settings.numPlayers,
    phase: ownProps.phase,
    user: state.user,
  };
}

const mapDispatchToProps = (dispatch: Redux.Dispatch<any>, ownProps: any): SearchDispatchProps => {
  return {
    onLoginRequest: (sub: boolean) => {
      dispatch(login((user: UserState)=> {
        if (sub && user.email && user.email !== '') {
          dispatch(subscribe(user.email));
        }
        dispatch(toCard('SEARCH_CARD', 'SETTINGS'));
      }));
    },
    onFilter: () => {
      dispatch(toCard('SEARCH_CARD', 'SETTINGS'));
    },
    onSearch: (numPlayers: number, user: UserState, request: SearchSettings) => {
      dispatch(search(numPlayers, user, request));
    },
    onQuest: (quest: QuestDetails) => {
      dispatch(viewQuest(quest));
      dispatch(toCard('SEARCH_CARD', 'DETAILS'));
    },
    onPlay: (quest: QuestDetails) => {
      dispatch(fetchQuestXML(quest));
    },
  };
}

const SearchContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Search);

export default SearchContainer
