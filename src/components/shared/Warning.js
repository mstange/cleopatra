/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import React, { PureComponent } from 'react';
import './Warning.css';

type Props = {|
  +message: string,
  +actionText?: string,
  +actionTitle?: string,
  +actionOnClick?: () => mixed,
  +onClose?: () => mixed,
|};

type State = {|
  +isNoticeDisplayed: boolean,
|};

export class Warning extends PureComponent<Props, State> {
  state = { isNoticeDisplayed: true };

  _onHideClick = () => {
    this.setState({
      isNoticeDisplayed: false,
    });

    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    if (!this.state.isNoticeDisplayed) {
      return null;
    }

    const { message, actionText, actionTitle, actionOnClick } = this.props;

    return (
      <div className="warningMessageBarWrapper">
        <div className="photon-message-bar photon-message-bar-warning warningMessageBar">
          <div className="photon-message-bar-inner-content">
            <div className="photon-message-bar-inner-text">{message}</div>
            {actionText ? (
              <button
                className="photon-button photon-button-micro photon-message-bar-action-button"
                type="button"
                title={actionTitle}
                aria-label={actionTitle}
                onClick={actionOnClick}
              >
                {actionText}
              </button>
            ) : null}
          </div>
          <button
            className="photon-button photon-message-bar-close-button"
            type="button"
            aria-label="Hide the message"
            title="Hide the message"
            onClick={this._onHideClick}
          />
        </div>
      </div>
    );
  }
}
