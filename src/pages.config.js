import Appointments from './pages/Appointments';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import Contracts from './pages/Contracts';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Professionals from './pages/Professionals';
import Quotes from './pages/Quotes';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Appointments": Appointments,
    "ClientDetail": ClientDetail,
    "Clients": Clients,
    "Contracts": Contracts,
    "Dashboard": Dashboard,
    "Inventory": Inventory,
    "Professionals": Professionals,
    "Quotes": Quotes,
    "Reports": Reports,
    "Sales": Sales,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};