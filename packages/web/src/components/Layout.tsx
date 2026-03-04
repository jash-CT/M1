import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white shadow">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <nav className="flex items-center gap-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `font-medium ${isActive ? 'text-brand-300' : 'text-slate-300 hover:text-white'}`
              }
            >
              Dashboard
            </NavLink>
            {user?.tenantId && (
              <>
                <NavLink
                  to="/orders"
                  className={({ isActive }) =>
                    `font-medium ${isActive ? 'text-brand-300' : 'text-slate-300 hover:text-white'}`
                  }
                >
                  Orders
                </NavLink>
                <NavLink
                  to="/analytics"
                  className={({ isActive }) =>
                    `font-medium ${isActive ? 'text-brand-300' : 'text-slate-300 hover:text-white'}`
                  }
                >
                  Analytics
                </NavLink>
                <NavLink
                  to="/integrations"
                  className={({ isActive }) =>
                    `font-medium ${isActive ? 'text-brand-300' : 'text-slate-300 hover:text-white'}`
                  }
                >
                  Integrations
                </NavLink>
              </>
            )}
            {user?.platformRole === 'platform_admin' && (
              <>
                <NavLink
                  to="/tenants"
                  className={({ isActive }) =>
                    `font-medium ${isActive ? 'text-brand-300' : 'text-slate-300 hover:text-white'}`
                  }
                >
                  Tenants
                </NavLink>
                <NavLink
                  to="/platform"
                  className={({ isActive }) =>
                    `font-medium ${isActive ? 'text-brand-300' : 'text-slate-300 hover:text-white'}`
                  }
                >
                  Platform
                </NavLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {user?.email}
              {user?.tenantId && ` · ${user.tenantRole}`}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
