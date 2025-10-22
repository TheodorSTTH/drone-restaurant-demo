import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import NotFound from './pages/NotFound.tsx';
import Protected from './components/Protected.tsx';
import Home from './pages/Home.tsx';
import Layout from './components/Layout.tsx';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import Products from './pages/Products.tsx';
import Restaurant from './pages/Restaurant.tsx';

const router = createBrowserRouter([
  { path: "/", element: <Home /> },

  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "dashboard", element: <Protected><Dashboard /></Protected> },
      { path: "products",  element: <Protected><Products /></Protected> },
      { path: "restaurant", element: <Protected><Restaurant /></Protected> },
    ],
  },

  { path: "*", element: <NotFound /> },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);