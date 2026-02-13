import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const SiteSettingsContext = createContext();

export const useSiteSettings = () => {
    const context = useContext(SiteSettingsContext);
    if (!context) {
        throw new Error('useSiteSettings must be used within SiteSettingsProvider');
    }
    return context;
};

export const SiteSettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            setSettings(data);
        } catch (error) {
            console.error('Failed to load site settings:', error);
            // Use defaults if fetch fails
            setSettings({
                siteName: 'TechyPOS',
                siteTagline: 'Professional Repair Management System',
                metaTitle: 'TechyPOS - Repair Shop Management',
                metaDescription: 'Professional point-of-sale and repair management system',
                primaryColor: '#2563eb'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSettings = async (newSettings) => {
        try {
            const { data } = await api.put('/settings', newSettings);
            setSettings(data);
            return { success: true, data };
        } catch (error) {
            console.error('Failed to update settings:', error);
            return { success: false, error: error.response?.data?.message || 'Update failed' };
        }
    };

    const uploadImage = async (file) => {
        try {
            const formData = new FormData();
            formData.append('image', file);

            const { data } = await api.post('/settings/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return { success: true, url: data.url };
        } catch (error) {
            console.error('Failed to upload image:', error);
            return { success: false, error: error.response?.data?.message || 'Upload failed' };
        }
    };

    const value = {
        settings,
        loading,
        updateSettings,
        uploadImage,
        refreshSettings: fetchSettings
    };

    return (
        <SiteSettingsContext.Provider value={value}>
            {children}
        </SiteSettingsContext.Provider>
    );
};
