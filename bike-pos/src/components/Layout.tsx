import {
    BarChart as BarChartIcon,
    Category as CategoryIcon,
    Dashboard as DashboardIcon,
    Inventory as InventoryIcon,
    LocalShipping as LocalShippingIcon,
    Logout as LogoutIcon,
    Menu as MenuIcon,
    Receipt as ReceiptIcon,
    ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

const menuItems = [
  { name: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { name: 'Point of Sale', icon: <ShoppingCartIcon />, path: '/pos' },
  { name: 'Products', icon: <InventoryIcon />, path: '/products' },
  { name: 'Categories', icon: <CategoryIcon />, path: '/categories' },
  { name: 'Suppliers', icon: <LocalShippingIcon />, path: '/suppliers' },
  { name: 'Sales', icon: <ReceiptIcon />, path: '/sales' },
  { name: 'Reports', icon: <BarChartIcon />, path: '/reports' },
];

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Handle user menu open
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle user menu close
  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };
  
  // Drawer content
  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Bike Parts POS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.name} disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'primary.main' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.name}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 'bold' : 'normal',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </div>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === location.pathname)?.name || 'Dashboard'}
          </Typography>
          
          {/* User menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              color="inherit"
              onClick={handleUserMenuOpen}
              sx={{ textTransform: 'none' }}
              startIcon={
                <Avatar sx={{ width: 32, height: 32 }}>
                  {user?.username.charAt(0).toUpperCase()}
                </Avatar>
              }
            >
              {user?.username}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="textSecondary">
                  Role: {user && user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout; 