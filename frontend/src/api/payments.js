import api from './axios';

export async function createCheckoutSession(orderId) {
  const { data } = await api.post(`/api/payments/checkout/${orderId}/`);
  return data.checkout_url;
}