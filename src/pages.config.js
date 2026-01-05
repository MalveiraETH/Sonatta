import Appointments from './pages/Appointments';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import Contracts from './pages/Contracts';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import Professionals from './pages/Professionals';
import Quotes from './pages/Quotes';
import Settings from './pages/Settings';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Appointments": Appointments,
    "ClientDetail": ClientDetail,
    "Clients": Clients,
    "Contracts": Contracts,
    "Dashboard": Dashboard,
    "ProductDetail": ProductDetail,
    "Professionals": Professionals,
    "Quotes": Quotes,
    "Settings": Settings,
    "Inventory": Inventory,
    "Reports": Reports,
    "Sales": Sales,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};