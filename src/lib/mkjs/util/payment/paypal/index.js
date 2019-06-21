import { h, Component } from 'preact';

const APPLICATION_CURRENCY = "USD";
const PROCESSOR_NAME = "PAYPAL"

class PaypalPayment extends Component {
	componentDidMount(){
		let amount = new Number(this.props.amount).toFixed(2)
		let onPaymentSuccess = this.props.onPaymentSuccess;
		paypal.Buttons({
			createOrder: (data, actions) => {
				return actions.order.create({
					purchase_units: [{
						amount: {
							currency_code: APPLICATION_CURRENCY,
							value: amount
						}
					}],
					application_context: {
						shipping_preference: 'NO_SHIPPING'
					}
				});
			},
			onApprove: (data, actions) => {
				onPaymentSuccess({
					processor: PROCESSOR_NAME,
					processorTxId: data.orderID,
				})
				//DEBUGGING
				// actions.order.capture().then(function(details) {
				// 	console.log('Transaction completed! details:', details, "data:", data);
				// });
			}
		}).render('#paypal-component');
	}
	render() {
		return <div id="paypal-component"></div>
	}
}

export {
	PaypalPayment
}
