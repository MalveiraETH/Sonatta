import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Appointments from './pages/Appointments';
import Inventory from './pages/Inventory';
import Quotes from './pages/Quotes';
import Sales from './pages/Sales';
import Contracts from './pages/Contracts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "ClientDetail": ClientDetail,
    "Appointments": Appointments,
    "Inventory": Inventory,
    "Quotes": Quotes,
    "Sales": Sales,
    "Contracts": Contracts,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};