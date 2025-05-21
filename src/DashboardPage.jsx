import React from 'react'
import SideNav from './components/AdminLayout/SideNav'
import { Outlet } from 'react-router-dom'
import './components/AdminLayout/DashboardPage.css'

const DashboardPage = ({ userRole = "admin", children }) => {
  console.log('DashboardPage rendering with userRole:', userRole);
  
  return (
    <div className="dashboard-containers1">
      <SideNav userRole={userRole} />
      <div className="dashboard-contents1">
        {children || <Outlet />}
      </div>
    </div>
  )
}

export default DashboardPage