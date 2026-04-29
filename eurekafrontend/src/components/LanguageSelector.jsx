import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Tooltip
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Configurazione delle lingue supportate
  const languages = [
    {
      code: 'it',
      name: 'Italiano',
      flag: '🇮🇹',
      nativeName: 'Italiano'
    },
    {
      code: 'en', 
      name: 'English',
      flag: '🇬🇧',
      nativeName: 'English'
    },
    {
      code: 'es',
      name: 'Español', 
      flag: '🇪🇸',
      nativeName: 'Español'
    },
    {
    code: 'ca',
    name: 'Catalan',
    flag: '🇦🇩',
    nativeName: 'Català'
  }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      handleClose();
      
      // Feedback visivo opzionale
      console.log(`Lingua cambiata in: ${languageCode}`);
    } catch (error) {
      console.error('Errore nel cambio lingua:', error);
    }
  };

  return (
    <Box>
      <Tooltip title={t('navbar.language')} arrow>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          startIcon={<LanguageIcon />}
          sx={{
            minWidth: 'auto',
            borderRadius: 2,
            textTransform: 'none',
            color: 'text.primary',
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              component="span"
              sx={{ 
                fontSize: '1.2rem',
                lineHeight: 1,
                minWidth: '20px',
                textAlign: 'center'
              }}
            >
              {currentLanguage.flag}
            </Typography>
            <Typography
              variant="body2"
              sx={{ 
                fontWeight: 500,
                display: { xs: 'none', sm: 'block' }
              }}
            >
              {currentLanguage.code.toUpperCase()}
            </Typography>
          </Box>
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            minWidth: 160,
            mt: 1,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={language.code === i18n.language}
            sx={{
              py: 1.5,
              px: 2,
              borderRadius: 1,
              mx: 0.5,
              mb: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'translateX(4px)'
              },
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark'
                }
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography
                component="span"
                sx={{ 
                  fontSize: '1.3rem',
                  lineHeight: 1,
                  minWidth: '24px',
                  textAlign: 'center'
                }}
              >
                {language.flag}
              </Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {language.nativeName}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.75rem'
                  }}
                >
                  {language.name}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSelector;