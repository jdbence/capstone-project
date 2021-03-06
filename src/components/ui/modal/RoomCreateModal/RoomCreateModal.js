import React, { Component, PropTypes } from 'react';
import { themr } from 'react-css-themr';
import defaultTheme from './RoomCreateModal.scss';
import Dialog from 'react-toolbox/components/dialog';
import { Button } from 'react-toolbox/components/button';
import { Tab, Tabs } from 'react-toolbox/components/tabs';
import Input from 'react-toolbox/components/input';
import FreeForAll from '-!babel!svg-react!static/svg/freeforall.svg?name=FreeForAll';
import Teams from '-!babel!svg-react!static/svg/teams.svg?name=Teams';
import { random } from 'lodash';
import utils from 'react-toolbox/components/utils/utils';
import classNames from 'classnames';
import ReactDOM from 'react-dom';

@themr('RoomCreateModal', defaultTheme)
class RoomCreateModal extends Component {
  
    static propTypes = {
      theme: PropTypes.object.isRequired,
      open: PropTypes.bool.isRequired,
      router: PropTypes.shape({
        push: PropTypes.func.isRequired
      }).isRequired,
      modeIndex: PropTypes.number.isRequired,
      onModeClick: PropTypes.func.isRequired
    }
    
    state = {
      code: '',
      codeError: '',
      index: 0
    }
    
    /**
     * Set focus on createTab when Modal opens
     *
     */
    componentDidUpdate(prevProps, prevState){
      if(this.props.open != prevProps.open && this.props.open){
        setTimeout(() => {
          ReactDOM.findDOMNode(this.refs.createTab).focus();
        }, 250);
      }
    }
    
    handleChange = (name, value) => {
      let error = this.state.codeError;
      
      // code only allows alpha-numeric
      if(name == 'code'){
        value = value.replace(/[^a-z0-9]/gi,'');
        if(value.length == 0){
          error = 'Invalid Code!';
        }else if(this.state.codeError != ''){
          error = '';
        }
      }
      this.setState({...this.state, [name]: value, codeError: error});
    }
    
    handleTabChange = (index) => {
      this.setState({index});
    };
    
    handleCreateRoom = () => {
      let roomID = random(0, 99999);
      
      this.props.router.push(`/room/${roomID}`);
    }
    
    handleJoinRoom = () => {
      let roomID = this.state.code;
      this.props.router.push(`/room/${roomID}`);
    }
    
    handleCodeInput = (e) => {
      //e.keyCode
    }
    
    handlePlayerChange = (field, value) => {
      this.setState({...this.state, [field]: value});
    };
    
    renderM = (ModeSVG, mode, desc, index, selectedIndex, ariakey) => {
      const { theme, onModeClick } = this.props;
      const aria = {
        'role': 'radio',
        'tabIndex': index === selectedIndex ? 0 : -1
      };
      const modeClasses = classNames(
        theme.mode,
        index === selectedIndex ? theme.modeSelected : ''
      );
      return (
        <div key={`mode_${index}`} className={modeClasses} {...aria} onClick={() => onModeClick(index)}>
          <ModeSVG className={theme.notouch} width={200} height={200} role="presentation" aria-hidden="true"/>
          <div>
            {mode}
            <p>{desc}</p>
          </div>
        </div>
      );
    }
    
    renderModes = (ariakey) => {
      const { theme, modeIndex } = this.props;
      const aria = {
        'role': 'radiogroup',
        'aria-labelledby': ariakey
      };
      const info = [
        {cls: Teams, title: 'Teams', desc: 'Players are split into teams of two.'},
        {cls: FreeForAll, title: 'Free For All', desc: 'All players are against one another.'}
      ];
      return (
        <div className={theme.modeContainer} {...aria}>
          {info.map((d, i) => this.renderM(d.cls, d.title, d.desc, i, modeIndex, ariakey))}
        </div>
      );
    }
  
    render() {
      const { theme, open } = this.props;
      const ariakey = `mode_${utils.ruuid()}`;
      return (
        <Dialog active={open} theme={theme}>
          <Tabs index={this.state.index} theme={theme} onChange={this.handleTabChange}>
            <Tab ref="createTab" label="Create Room" theme={theme} >
              <small id={ariakey}>How to play :</small>
              {this.renderModes(ariakey)}
              <footer className={theme.buttons}>
                <Button label="Create!" raised primary onClick={this.handleCreateRoom}/>
              </footer>
            </Tab>
            <Tab label="Join Room" theme={theme}>
              <small>Join a friend's game :</small>
              <div className={theme.tabBody}>
                <Input
                  type="text"
                  label="Room Code"
                  name="code"
                  icon="vpn_key"
                  value={this.state.code}
                  error={this.state.codeError}
                  onKeyPress={this.handleCodeInput}
                  onChange={this.handleChange.bind(this, 'code')}
                  maxLength={15}
                  className={theme.code}
                />
              </div>
              <footer className={theme.buttons}>
                <Button label="Join!" raised primary
                  onClick={this.handleJoinRoom}
                  disabled={this.state.codeError != ''}
                />
              </footer>
            </Tab>
          </Tabs>
        </Dialog>
      );
    }
}
export default RoomCreateModal;
