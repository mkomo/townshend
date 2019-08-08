import { h, Component } from 'preact';
import { Loading } from 'lib/mkjs';

const PROCESSOR_NAME = "PAYPAL"

class PaypalPayment extends Component {

	componentDidMount(){
		if (!('paypal' in window)) {
			let paypalClientId = this.props.paypalClientId;
			console.log('failed to find paypal. loading script', paypalClientId, this.props);
			const script = document.createElement("script");
			script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}`;
			script.async = true;

			script.onload = (a,b,c) => {
				 console.log('loaded paypal script',a, b,c)
				 this.componentDidMount();
			}
			document.body.appendChild(script);
			return;
		}
		let amount = new Number(this.props.amount).toFixed(2)
		let onPaymentSuccess = this.props.onPaymentSuccess;
		paypal.Buttons({
			createOrder: (data, actions) => {
				return actions.order.create({
					purchase_units: [{
						amount: {
							currency_code: this.props.paypalCurrency,
							value: amount
						}
					}],
					application_context: {
						shipping_preference: 'NO_SHIPPING'
					}
				});
			},
			onApprove: (data, actions) => {
				return actions.order.capture().then(function(details) {
					console.log('Transaction completed! details:', details, "data:", data);
					onPaymentSuccess({
						processor: PROCESSOR_NAME,
						processorTxId: data.orderID,
					})
				});
			}
		}).render('#paypal-component');
	}

	shouldComponentUpdate() {
		return false;
	}

	render() {
		//TODO figure out how to add loading
		return <div id="paypal-component"></div>
	}
}

export {
	PaypalPayment
}
