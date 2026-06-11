const BUSINESS_ID = 'kaigo-oen-point';
type Params = Record<string, string | number | boolean | undefined>;
function gtagSafe(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  w.gtag?.(...args);
}
export function trackPageView(path: string) {
  gtagSafe('event', 'page_view', {
    page_path: path, page_location: window.location.href,
    page_title: document.title, business_id: BUSINESS_ID,
  });
}
export function track(event: string, params: Params = {}) {
  gtagSafe('event', event, { business_id: BUSINESS_ID, ...params });
}
export const trackSignUp = () => track('sign_up', { method: 'email' });
export const trackProfileComplete = () => track('profile_complete');
export const trackReferralSent = () => track('referral_sent');
export const trackCtaClick = (label: string) => track('cta_click', { cta_label: label });
