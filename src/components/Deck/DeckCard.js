import React, { Component, PropTypes } from 'react';
import { themr } from 'react-css-themr';
import theme from './DeckCard.scss';
import classNames from 'classnames';
import {Motion, spring} from 'react-motion';

export const cardDefaults = {
  suit: 'diamond',
  value: '10',
  x: 0,
  y: 0,
  z: 0,
  scale: 0.5,
  angle: 0,
  order: 1,
  flipped: false
};

@themr('DeckCard', theme)
export default class DeckCard extends Component {
  
  static propTypes = {
    theme: PropTypes.object.isRequired,
    suit: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    z: PropTypes.number.isRequired,
    scale: PropTypes.number.isRequired,
    angle: PropTypes.number.isRequired,
    order: PropTypes.number.isRequired,
    flipped: PropTypes.bool.isRequired
  }
  
  static defaultProps = cardDefaults
  
  cardMotion(x, y, scale, angle, order) {
    return {
      WebkitTransform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${angle}deg)`,
      transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${angle}deg)`,
      zIndex: order
    };
  }
  
  render() {
    let {x, y, scale, angle, flipped, order} = this.props;
    let style = {x: spring(x), y: spring(y), angle: spring(angle)};
    const front = classNames(theme.front,
      flipped ? theme.flipped : '',
      theme[`suit${this.props.suit}`]);
    const back = classNames(theme.back,
      flipped ? theme.flipped : '');
    return (
      <Motion style={style}>
        {
          ({x, y, angle}) => (
            <div className={theme.move} style={this.cardMotion(x, y, scale, angle, order)}>
              <div className={theme.originb}></div>
              <div className={theme.inner}>
                <div className={front}>
                  <p>{this.props.value}</p>
                </div>
                <div className={back}></div>
                <div className={theme.origin}></div>
              </div>
            </div>
          )
        }
      </Motion>
      
    );
  }
}