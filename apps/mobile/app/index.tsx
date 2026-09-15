import { Link } from 'expo-router';
import { PlaceholderScreen } from '../src/components/placeholder-screen';

export default function Welcome() {
  return (
    <PlaceholderScreen title="Welcome">
      <Link href="/connect">Connect / Sign In</Link>
      <Link href="/home">Home</Link>
      <Link href="/scanner">QR Scanner</Link>
      <Link href="/confirmation">Payment Confirmation</Link>
      <Link href="/processing">Processing</Link>
      <Link href="/success">Payment Success</Link>
      <Link href="/failed">Payment Failed</Link>
      <Link href="/activity">Activity</Link>
      <Link href="/details">Transaction Details</Link>
    </PlaceholderScreen>
  );
}
