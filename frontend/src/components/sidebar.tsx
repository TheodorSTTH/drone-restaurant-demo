import { LayoutDashboard, Package, Settings, Store } from "lucide-react";
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  
  const isDashboardActive = location.pathname === "/dashboard";
  const isProductsActive = location.pathname === "/products";
  const isRestaurantActive = location.pathname === "/restaurant";
  
  return (
    <div className="drawer drawer-open shrink-0 w-min">
      <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        {/* Page content here */}
      </div>

      <div className="drawer-side is-drawer-close:overflow-visible">
        <label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay"></label>
        <div className="is-drawer-close:w-14 is-drawer-open:w-64 bg-base-200 flex flex-col items-start min-h-full">
          {/* Sidebar content here */}
          <ul className="menu w-full grow">

            <Link to="/dashboard">
              <li>
                <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Dashboard">
                  <LayoutDashboard size={20} className={isDashboardActive ? "text-primary" : ""} />
                  <span className="is-drawer-close:hidden">Dashboard</span>
                </button>
              </li>
            </Link>
            <Link to="/products">
              <li>
                <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Products">
                  <Package size={20} className={isProductsActive ? "text-primary" : ""} />
                  <span className="is-drawer-close:hidden">Products</span>
                </button>
              </li>
            </Link>
            <Link to="/restaurant">
              <li>
                <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Restaurant">
                  <Store size={20} className={isRestaurantActive ? "text-primary" : ""} />
                  <span className="is-drawer-close:hidden">Restaurant</span>
                </button>
              </li>
            </Link>

            
          </ul>

          {/* button to open/close drawer */}
          <div className="m-2 is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Open">
            <label htmlFor="my-drawer-4" className="btn btn-ghost btn-circle drawer-button is-drawer-open:rotate-y-180">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="inline-block size-4 my-1.5"><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"></path><path d="M9 4v16"></path><path d="M14 10l2 2l-2 2"></path></svg>
            </label>
          </div>

        </div>
      </div>
    </div>
  )
}