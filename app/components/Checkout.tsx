import * as React from 'react'

import Button from './base/Button'
import Card from './base/Card'
import {authSettings} from '../Constants'
import {CheckoutState, QuestState, UserState} from '../reducers/StateTypes'

const dropin = require('braintree-web-drop-in');

export interface CheckoutStateProps extends React.Props<any> {
  checkout: CheckoutState,
  quest: QuestState,
  user: UserState,
}

export interface CheckoutDispatchProps {
  onError: (error: string) => void;
  onHome: () => void;
  onPhaseChange: (phase: string) => void;
  onSubmit: (braintree: any, checkout: CheckoutState, user: UserState) => void;
}

export interface CheckoutProps extends CheckoutStateProps, CheckoutDispatchProps {}

export default class Checkout extends React.Component<CheckoutProps, {}> {
  state: { braintreeInstance: any };

  constructor(props: CheckoutProps) {
    super(props);
    this.state = { braintreeInstance: null };
  }

  componentDidMount () {
    if (this.state.braintreeInstance) { return; }
    dropin.create({
      authorization: this.props.checkout.braintreeToken,
      container: '#braintreeDropin',
      // TODO paypal payment not currently working, "No value passed to payment"
      // paypal: {
      //   flow: 'vault',
      //   amount: this.props.checkout.amount,
      //   currency: 'USD',
      // },
    }, (err: string, instance: Object) => {
      if (err) {
        return this.props.onError(err);
      }
      this.setState({braintreeInstance: instance});
      this.props.onPhaseChange('ENTRY');
    });
  }

  render() {
    const isInitialized = this.state.braintreeInstance !== null;
    const isLoading = this.props.checkout.phase === 'LOADING';
    switch (this.props.checkout.phase) {
      case 'LOADING':
        return (
          <Card title="Tip the Author">
            <div id="braintree">
              <div id="braintreeDropin" className="hidden"></div>
              <div className="centralMessage">Loading payment form, one moment...</div>
            </div>
          </Card>
        );
      case 'ENTRY':
        return (
          <Card title="Tip the Author">
            <div id="braintree">
              <div id="braintreeDropin"></div>
                <div>
                  <div id="checkoutTotal">Total: ${this.props.checkout.amount.toFixed(2)}</div>
                  <Button id="braintreeSubmit" disabled={isLoading} onTouchTap={() => this.props.onSubmit(this.state.braintreeInstance, this.props.checkout, this.props.user)}>
                    {(isLoading) ? 'Loading...' : 'Pay'}
                  </Button>
                </div>
            </div>
          </Card>
        );
      case 'PROCESSING':
        return (
          <Card title="Tip the Author">
            <div id="braintree">
              <div id="braintreeDropin"></div>
              <div className="centralMessage">Processing payment, one moment...</div>
            </div>
          </Card>
        );
      case 'DONE':
        return (
          <Card title="Payment Complete">
            <div className="centralMessage">
              <p>Payment for ${this.props.checkout.amount} complete.</p>
              <p>Thank you for supporting Expedition!</p>
            </div>
            <Button onTouchTap={() => this.props.onHome()}>Return Home</Button>
          </Card>
        );
      default:
        return null;
    }
  }
}