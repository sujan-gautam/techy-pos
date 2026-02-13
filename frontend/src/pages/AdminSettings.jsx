import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
    Settings, Globe, Palette, Building2, Share2,
    Upload, Save, RefreshCw, Image as ImageIcon
} from 'lucide-react';

const AdminSettings = () => {
    const { user } = useAuth();
    const { settings: siteSettings, loading, updateSettings, uploadImage } = useSiteSettings();
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (siteSettings) {
            setFormData(siteSettings);
        }
    }, [siteSettings]);

    // Redirect if not admin
    if (user?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500">Only administrators can access site settings.</p>
                </div>
            </div>
        );
    }

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await updateSettings(formData);
        setSaving(false);

        if (result.success) {
            toast.success('Settings updated successfully');
        } else {
            toast.error(result.error || 'Failed to update settings');
        }
    };

    const handleImageUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const result = await uploadImage(file);
        setUploading(false);

        if (result.success) {
            handleChange(field, result.url);
            toast.success('Image uploaded successfully');
        } else {
            toast.error(result.error || 'Failed to upload image');
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'branding', label: 'Branding', icon: Palette },
        { id: 'seo', label: 'SEO', icon: Globe },
        { id: 'business', label: 'Business', icon: Building2 },
        { id: 'social', label: 'Social Media', icon: Share2 }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your site configuration, branding, and SEO</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <RefreshCw size={18} className="animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            <span>Save Changes</span>
                        </>
                    )}
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 p-1.5 flex items-center space-x-2 w-fit shadow-sm">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center space-x-2 ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">General Settings</h3>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Site Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.siteName || ''}
                                onChange={(e) => handleChange('siteName', e.target.value)}
                                placeholder="TechyPOS"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Site Tagline</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.siteTagline || ''}
                                onChange={(e) => handleChange('siteTagline', e.target.value)}
                                placeholder="Professional Repair Management System"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'branding' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Branding</h3>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
                            <div className="flex items-center space-x-4">
                                {formData.logoUrl && (
                                    <img src={formData.logoUrl} alt="Logo" className="h-16 w-auto border border-gray-200 rounded" />
                                )}
                                <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">
                                    <Upload size={16} />
                                    <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'logoUrl')}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Favicon</label>
                            <div className="flex items-center space-x-4">
                                {formData.faviconUrl && (
                                    <img src={formData.faviconUrl} alt="Favicon" className="h-8 w-8 border border-gray-200 rounded" />
                                )}
                                <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">
                                    <Upload size={16} />
                                    <span>{uploading ? 'Uploading...' : 'Upload Favicon'}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'faviconUrl')}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Color</label>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="color"
                                    className="h-10 w-20 border border-gray-200 rounded cursor-pointer"
                                    value={formData.primaryColor || '#2563eb'}
                                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    value={formData.primaryColor || '#2563eb'}
                                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                                    placeholder="#2563eb"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'seo' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">SEO Settings</h3>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Title</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.metaTitle || ''}
                                onChange={(e) => handleChange('metaTitle', e.target.value)}
                                placeholder="TechyPOS - Repair Shop Management"
                            />
                            <p className="text-xs text-gray-500 mt-1">Recommended: 50-60 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Description</label>
                            <textarea
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="3"
                                value={formData.metaDescription || ''}
                                onChange={(e) => handleChange('metaDescription', e.target.value)}
                                placeholder="Professional point-of-sale and repair management system"
                            />
                            <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Keywords</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.metaKeywords || ''}
                                onChange={(e) => handleChange('metaKeywords', e.target.value)}
                                placeholder="repair shop, POS, inventory management"
                            />
                            <p className="text-xs text-gray-500 mt-1">Comma-separated keywords</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Open Graph Image URL</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.ogImage || ''}
                                onChange={(e) => handleChange('ogImage', e.target.value)}
                                placeholder="/uploads/og-image.jpg"
                            />
                            <p className="text-xs text-gray-500 mt-1">Image for social media sharing (1200x630px recommended)</p>
                        </div>
                    </div>
                )}

                {activeTab === 'business' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Business Information</h3>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.businessName || ''}
                                    onChange={(e) => handleChange('businessName', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                                <input
                                    type="tel"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.businessPhone || ''}
                                    onChange={(e) => handleChange('businessPhone', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.businessEmail || ''}
                                onChange={(e) => handleChange('businessEmail', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                            <textarea
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="2"
                                value={formData.businessAddress || ''}
                                onChange={(e) => handleChange('businessAddress', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Business Hours</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.businessHours || ''}
                                onChange={(e) => handleChange('businessHours', e.target.value)}
                                placeholder="Mon-Fri: 9AM-6PM"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'social' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Social Media Links</h3>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Facebook URL</label>
                            <input
                                type="url"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.facebookUrl || ''}
                                onChange={(e) => handleChange('facebookUrl', e.target.value)}
                                placeholder="https://facebook.com/yourpage"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Twitter URL</label>
                            <input
                                type="url"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.twitterUrl || ''}
                                onChange={(e) => handleChange('twitterUrl', e.target.value)}
                                placeholder="https://twitter.com/yourhandle"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Instagram URL</label>
                            <input
                                type="url"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.instagramUrl || ''}
                                onChange={(e) => handleChange('instagramUrl', e.target.value)}
                                placeholder="https://instagram.com/yourhandle"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn URL</label>
                            <input
                                type="url"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.linkedinUrl || ''}
                                onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                                placeholder="https://linkedin.com/company/yourcompany"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSettings;
