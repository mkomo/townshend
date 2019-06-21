import { h, Component } from 'preact';
import { PaypalPayment } from './paypal'

class Payment extends Component {
  render() {
    return <PaypalPayment {...this.props}/>
  }
}

function formatUsd(dollars) {
  return "$" + (dollars).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

export {
  Payment,
  formatUsd
}
