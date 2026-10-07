import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { RequirePermission } from './components/admin/RequirePermission';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { OrdersProvider } from './contexts/OrdersContext';
import { ReviewsProvider } from './contexts/ReviewsContext';
import { UIProvider } from './contexts/UIContext';
import { SiteLayout } from './components/layout/SiteLayout';
import { Home } from './pages/Home';

/** Route-level code splitting: only the homepage ships in the initial bundle. */
function page<P extends object, K extends string>(loader: () => Promise<{ [key in K]: React.ComponentType<P> }>, name: K) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}

const HairsHome = page(() => import('./pages/shop/HairsHome'), 'HairsHome');
const ToolsHome = page(() => import('./pages/shop/ToolsHome'), 'ToolsHome');
const ProductListing = page(() => import('./pages/shop/ProductListing'), 'ProductListing');
const ProductDetail = page(() => import('./pages/shop/ProductDetail'), 'ProductDetail');
const SearchResults = page(() => import('./pages/shop/SearchResults'), 'SearchResults');
const Cart = page(() => import('./pages/shop/Cart'), 'Cart');
const Wishlist = page(() => import('./pages/shop/Wishlist'), 'Wishlist');
const Checkout = page(() => import('./pages/checkout/Checkout'), 'Checkout');
const OrderConfirmation = page(() => import('./pages/checkout/OrderConfirmation'), 'OrderConfirmation');
const TrackOrder = page(() => import('./pages/checkout/TrackOrder'), 'TrackOrder');
const SalonHome = page(() => import('./pages/salon/SalonHome'), 'SalonHome');
const SalonServices = page(() => import('./pages/salon/SalonServices'), 'SalonServices');
const ServiceDetail = page(() => import('./pages/salon/ServiceDetail'), 'ServiceDetail');
const BookAppointment = page(() => import('./pages/salon/BookAppointment'), 'BookAppointment');
const AppointmentConfirmation = page(() => import('./pages/salon/AppointmentConfirmation'), 'AppointmentConfirmation');
const Login = page(() => import('./pages/auth/Login'), 'Login');
const Register = page(() => import('./pages/auth/Register'), 'Register');
const ForgotPassword = page(() => import('./pages/auth/ForgotPassword'), 'ForgotPassword');
const ResetPassword = page(() => import('./pages/auth/ResetPassword'), 'ResetPassword');
const CreateAccount = page(() => import('./pages/auth/CreateAccount'), 'CreateAccount');
const AccountLayout = page(() => import('./components/account/AccountLayout'), 'AccountLayout');
const AccountOverview = page(() => import('./pages/account/AccountOverview'), 'AccountOverview');
const AccountOrders = page(() => import('./pages/account/AccountOrders'), 'AccountOrders');
const AccountOrderDetail = page(() => import('./pages/account/AccountOrderDetail'), 'AccountOrderDetail');
const AccountAppointments = page(() => import('./pages/account/AccountAppointments'), 'AccountAppointments');
const AccountWishlist = page(() => import('./pages/account/AccountWishlist'), 'AccountWishlist');
const AccountAddresses = page(() => import('./pages/account/AccountAddresses'), 'AccountAddresses');
const AccountReviews = page(() => import('./pages/account/AccountReviews'), 'AccountReviews');
const AccountProfile = page(() => import('./pages/account/AccountProfile'), 'AccountProfile');
const About = page(() => import('./pages/info/About'), 'About');
const Contact = page(() => import('./pages/info/Contact'), 'Contact');
const FAQ = page(() => import('./pages/info/FAQ'), 'FAQ');
const Policy = page(() => import('./pages/info/Policy'), 'Policy');
const NotFound = page(() => import('./pages/info/NotFound'), 'NotFound');
const AdminLayout = page(() => import('./components/admin/layout/AdminLayout'), 'AdminLayout');
const AdminLogin = page(() => import('./pages/admin/AdminLogin'), 'AdminLogin');
const AdminDashboard = page(() => import('./pages/admin/Dashboard'), 'Dashboard');
const AdminOrders = page(() => import('./pages/admin/orders/Orders'), 'Orders');
const AdminOrderDetail = page(() => import('./pages/admin/orders/OrderDetail'), 'OrderDetail');
const AdminProducts = page(() => import('./pages/admin/products/Products'), 'Products');
const AdminProductEditor = page(() => import('./pages/admin/products/ProductEditor'), 'ProductEditor');
const AdminInventory = page(() => import('./pages/admin/products/Inventory'), 'Inventory');
const AdminAppointments = page(() => import('./pages/admin/salon/Appointments'), 'Appointments');
const AdminCalendar = page(() => import('./pages/admin/salon/AdminCalendar'), 'AdminCalendar');
const AdminComingSoon = page(() => import('./pages/admin/AdminComingSoon'), 'AdminComingSoon');
const AdminAnalytics = page(() => import('./pages/admin/Analytics'), 'Analytics');
const AdminCustomers = page(() => import('./pages/admin/customers/Customers'), 'Customers');
const AdminCustomerDetail = page(() => import('./pages/admin/customers/CustomerDetail'), 'CustomerDetail');
const AdminCustomerActivity = page(() => import('./pages/admin/customers/CustomerActivity'), 'CustomerActivity');
const AdminReviews = page(() => import('./pages/admin/catalog/Reviews'), 'Reviews');
const AdminCategories = page(() => import('./pages/admin/catalog/Categories'), 'Categories');
const AdminDiscounts = page(() => import('./pages/admin/catalog/Discounts'), 'Discounts');
const AdminSalonServices = page(() => import('./pages/admin/salon/SalonServices'), 'SalonServices');
const AdminServiceEditor = page(() => import('./pages/admin/salon/ServiceEditor'), 'ServiceEditor');
const AdminSpecialists = page(() => import('./pages/admin/salon/Specialists'), 'Specialists');
const AdminAvailability = page(() => import('./pages/admin/salon/Availability'), 'Availability');
const AdminHomepage = page(() => import('./pages/admin/website/HomepageContent'), 'HomepageContent');
const AdminAbout = page(() => import('./pages/admin/website/AboutContent'), 'AboutContent');
const AdminFaqs = page(() => import('./pages/admin/website/FaqContent'), 'FaqContent');
const AdminPages = page(() => import('./pages/admin/website/PagesContent'), 'PagesContent');
const AdminMedia = page(() => import('./pages/admin/website/MediaLibrary'), 'MediaLibrary');
const AdminDelivery = page(() => import('./pages/admin/operations/DeliverySettings'), 'DeliverySettings');
const AdminPayments = page(() => import('./pages/admin/operations/PaymentSettings'), 'PaymentSettings');
const AdminWhatsApp = page(() => import('./pages/admin/operations/WhatsAppSettings'), 'WhatsAppSettings');
const AdminEmail = page(() => import('./pages/admin/operations/EmailSettings'), 'EmailSettings');
const AdminNotifications = page(() => import('./pages/admin/operations/Notifications'), 'Notifications');
const AdminUsersPage = page(() => import('./pages/admin/administration/AdminUsers'), 'AdminUsers');
const AdminRoles = page(() => import('./pages/admin/administration/Roles'), 'Roles');
const AdminActivity = page(() => import('./pages/admin/administration/ActivityLogs'), 'ActivityLogs');
const AdminBusinessSettings = page(() => import('./pages/admin/settings/BusinessSettings'), 'BusinessSettings');
const AdminSocialSettings = page(() => import('./pages/admin/settings/SocialSettings'), 'SocialSettings');
const AdminSecuritySettings = page(() => import('./pages/admin/settings/SecuritySettings'), 'SecuritySettings');

interface AppProps {
  /** Shows or hides the Pay on Delivery payment option at checkout. */
  payOnDeliveryEnabled?: boolean;
}

export function App({ payOnDeliveryEnabled = true }: AppProps) {
  return (
    <SettingsProvider value={{ payOnDeliveryEnabled }}>
      <AuthProvider>
        <OrdersProvider>
          <ReviewsProvider>
            <CartProvider>
              <WishlistProvider>
                <UIProvider>
                  <AdminAuthProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/admin/login" element={<Suspense fallback={null}><AdminLogin /></Suspense>} />
                      <Route path="/admin" element={<Suspense fallback={null}><AdminLayout /></Suspense>}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<RequirePermission permission="dashboard.view"><AdminDashboard /></RequirePermission>} />
                        <Route path="orders" element={<RequirePermission permission="orders.view"><AdminOrders /></RequirePermission>} />
                        <Route path="orders/:orderNumber" element={<RequirePermission permission="orders.view"><AdminOrderDetail /></RequirePermission>} />
                        <Route path="products" element={<RequirePermission permission="products.view"><AdminProducts /></RequirePermission>} />
                        <Route path="products/:id" element={<RequirePermission permission="products.view"><AdminProductEditor /></RequirePermission>} />
                        <Route path="inventory" element={<RequirePermission permission="inventory.manage"><AdminInventory /></RequirePermission>} />
                        <Route path="appointments" element={<RequirePermission permission="appointments.view"><AdminAppointments /></RequirePermission>} />
                        <Route path="calendar" element={<RequirePermission permission="appointments.view"><AdminCalendar /></RequirePermission>} />
                        <Route path="analytics" element={<RequirePermission permission="analytics.view"><AdminAnalytics /></RequirePermission>} />
                        <Route path="categories" element={<RequirePermission permission="categories.manage"><AdminCategories /></RequirePermission>} />
                        <Route path="reviews" element={<RequirePermission permission="reviews.view"><AdminReviews /></RequirePermission>} />
                        <Route path="discounts" element={<RequirePermission permission="discounts.manage"><AdminDiscounts /></RequirePermission>} />
                        <Route path="customers" element={<RequirePermission permission="customers.view"><AdminCustomers /></RequirePermission>} />
                        <Route path="customers/:id" element={<RequirePermission permission="customers.view"><AdminCustomerDetail /></RequirePermission>} />
                        <Route path="customer-activity" element={<RequirePermission permission="customers.view"><AdminCustomerActivity /></RequirePermission>} />
                        <Route path="salon/services" element={<RequirePermission permission="salon.services"><AdminSalonServices /></RequirePermission>} />
                        <Route path="salon/services/:slug" element={<RequirePermission permission="salon.services"><AdminServiceEditor /></RequirePermission>} />
                        <Route path="salon/specialists" element={<RequirePermission permission="salon.specialists"><AdminSpecialists /></RequirePermission>} />
                        <Route path="salon/availability" element={<RequirePermission permission="salon.availability"><AdminAvailability /></RequirePermission>} />
                        <Route path="website/homepage" element={<RequirePermission permission="content.homepage"><AdminHomepage /></RequirePermission>} />
                        <Route path="website/about" element={<RequirePermission permission="content.pages"><AdminAbout /></RequirePermission>} />
                        <Route path="website/faqs" element={<RequirePermission permission="content.pages"><AdminFaqs /></RequirePermission>} />
                        <Route path="website/pages" element={<RequirePermission permission="content.pages"><AdminPages /></RequirePermission>} />
                        <Route path="website/media" element={<RequirePermission permission="content.media"><AdminMedia /></RequirePermission>} />
                        <Route path="delivery" element={<RequirePermission permission="settings.delivery"><AdminDelivery /></RequirePermission>} />
                        <Route path="payments" element={<RequirePermission permission="settings.payment"><AdminPayments /></RequirePermission>} />
                        <Route path="whatsapp" element={<RequirePermission permission="settings.whatsapp"><AdminWhatsApp /></RequirePermission>} />
                        <Route path="email" element={<RequirePermission permission="settings.email"><AdminEmail /></RequirePermission>} />
                        <Route path="notifications" element={<AdminNotifications />} />
                        <Route path="admin-users" element={<RequirePermission permission="admins.manage"><AdminUsersPage /></RequirePermission>} />
                        <Route path="roles" element={<RequirePermission permission="admins.manage"><AdminRoles /></RequirePermission>} />
                        <Route path="activity" element={<RequirePermission permission="logs.view"><AdminActivity /></RequirePermission>} />
                        <Route path="settings" element={<Navigate to="/admin/settings/general" replace />} />
                        <Route path="settings/general" element={<RequirePermission permission="settings.general"><AdminBusinessSettings mode="general" /></RequirePermission>} />
                        <Route path="settings/business" element={<RequirePermission permission="settings.general"><AdminBusinessSettings mode="business" /></RequirePermission>} />
                        <Route path="settings/social" element={<RequirePermission permission="settings.general"><AdminSocialSettings /></RequirePermission>} />
                        <Route path="settings/security" element={<AdminSecuritySettings />} />
                        <Route path="*" element={<AdminComingSoon />} />
                      </Route>
                      <Route element={<SiteLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/hairs" element={<HairsHome />} />
                        <Route path="/hairs/shop/:category" element={<ProductListing division="hairs" />} />
                        <Route path="/hairs/product/:slug" element={<ProductDetail division="hairs" />} />
                        <Route path="/tools" element={<ToolsHome />} />
                        <Route path="/tools/shop/:category" element={<ProductListing division="tools" />} />
                        <Route path="/tools/product/:slug" element={<ProductDetail division="tools" />} />
                        <Route path="/search" element={<SearchResults />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
                        <Route path="/track-order" element={<TrackOrder />} />
                        <Route path="/salon" element={<SalonHome />} />
                        <Route path="/salon/services" element={<SalonServices />} />
                        <Route path="/salon/services/:slug" element={<ServiceDetail />} />
                        <Route path="/salon/book" element={<BookAppointment />} />
                        <Route path="/salon/appointment/:reference" element={<AppointmentConfirmation />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/create-account" element={<CreateAccount />} />
                        <Route path="/account" element={<AccountLayout />}>
                          <Route index element={<AccountOverview />} />
                          <Route path="orders" element={<AccountOrders />} />
                          <Route path="orders/:orderNumber" element={<AccountOrderDetail />} />
                          <Route path="appointments" element={<AccountAppointments />} />
                          <Route path="wishlist" element={<AccountWishlist />} />
                          <Route path="addresses" element={<AccountAddresses />} />
                          <Route path="reviews" element={<AccountReviews />} />
                          <Route path="profile" element={<AccountProfile />} />
                        </Route>
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/policies/:slug" element={<Policy />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </BrowserRouter>
                  </AdminAuthProvider>
                </UIProvider>
              </WishlistProvider>
            </CartProvider>
          </ReviewsProvider>
        </OrdersProvider>
      </AuthProvider>
    </SettingsProvider>);

}