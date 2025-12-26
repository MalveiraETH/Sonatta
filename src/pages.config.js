import Appointments from './pages/Appointments';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import Contracts from './pages/Contracts';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Quotes from './pages/Quotes';
import Sales from './pages/Sales';
import Professionals from './pages/Professionals';
import Reports from './pages/Reports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Appointments": Appointments,
    "ClientDetail": ClientDetail,
    "Clients": Clients,
    "Contracts": Contracts,
    "Dashboard": Dashboard,
    "Inventory": Inventory,
    "Quotes": Quotes,
    "Sales": Sales,
    "Professionals": Professionals,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};