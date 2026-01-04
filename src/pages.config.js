import Contracts from './pages/Contracts';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Professionals from './pages/Professionals';
import Quotes from './pages/Quotes';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Sales from './pages/Sales';
import ProductDetail from './pages/ProductDetail';
import Appointments from './pages/Appointments';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Contracts": Contracts,
    "Dashboard": Dashboard,
    "Inventory": Inventory,
    "Professionals": Professionals,
    "Quotes": Quotes,
    "Reports": Reports,
    "Settings": Settings,
    "Sales": Sales,
    "ProductDetail": ProductDetail,
    "Appointments": Appointments,
    "ClientDetail": ClientDetail,
    "Clients": Clients,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};