import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Edit3,
  Filter,
  Heart,
  Image as ImageIcon,
  Layers,
  Palette,
  Plus,
  Search,
  Shirt,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DuoDropdown } from './ui/DuoDropdown';
import { api } from '../services/apiClient';
import {
  OutfitDoc,
  PartnerProfileView,
  ProductOwnerSlot,
  WARDROBE_CATEGORIES,
  WARDROBE_OCCASIONS,
  WARDROBE_SEASONS,
  WardrobeCategory,
  WardrobeItemDoc,
  WardrobeOccasion,
  WardrobeSeason,
} from '../types';

interface WardrobeDashboardProps {
  profile: PartnerProfileView;
  partnerProfile: PartnerProfileView;
  items: WardrobeItemDoc[];
  outfits: OutfitDoc[];
  onSaveItem: (
    item: Omit<WardrobeItemDoc, 'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onSaveOutfit: (
    outfit: Omit<OutfitDoc, 'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteOutfit: (outfitId: string) => Promise<void>;
}

// Preset color palette for clothing
const PRESET_COLORS = [
  { name: 'Black', hex: '#09090b', border: 'border-white/20' },
  { name: 'White', hex: '#f8fafc', border: 'border-white/30' },
  { name: 'Heather Grey', hex: '#64748b', border: 'border-slate-500/30' },
  { name: 'Navy Blue', hex: '#1e3a8a', border: 'border-blue-700/40' },
  { name: 'Sky Blue', hex: '#38bdf8', border: 'border-sky-400/40' },
  { name: 'Beige / Cream', hex: '#d6c7a1', border: 'border-amber-200/30' },
  { name: 'Olive Green', hex: '#4d7c0f', border: 'border-lime-700/40' },
  { name: 'Forest Green', hex: '#14532d', border: 'border-emerald-800/40' },
  { name: 'Earth Brown', hex: '#78350f', border: 'border-amber-900/40' },
  { name: 'Burgundy / Wine', hex: '#881337', border: 'border-rose-900/40' },
  { name: 'Soft Pink', hex: '#f472b6', border: 'border-pink-400/40' },
  { name: 'Charcoal', hex: '#27272a', border: 'border-zinc-700/50' },
];

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

// Preset curated fashion silhouettes for instant photo placeholder selection
const PRESET_IMAGE_TEMPLATES: { label: string; category: WardrobeCategory; iconName: string; bgGradient: string }[] = [
  { label: 'Basic Tee', category: 'Tops', iconName: 'Shirt', bgGradient: 'from-zinc-800 to-zinc-900' },
  { label: 'Button-Up Shirt', category: 'Tops', iconName: 'Shirt', bgGradient: 'from-blue-950 to-zinc-900' },
  { label: 'Cozy Hoodie', category: 'Tops', iconName: 'Layers', bgGradient: 'from-indigo-950 to-zinc-900' },
  { label: 'Straight Jeans', category: 'Bottoms', iconName: 'Tag', bgGradient: 'from-sky-950 to-zinc-900' },
  { label: 'Tailored Trousers', category: 'Bottoms', iconName: 'Tag', bgGradient: 'from-stone-900 to-zinc-950' },
  { label: 'Clean Sneakers', category: 'Footwear', iconName: 'Sparkles', bgGradient: 'from-emerald-950 to-zinc-900' },
  { label: 'Leather Boots', category: 'Footwear', iconName: 'Sparkles', bgGradient: 'from-amber-950 to-zinc-900' },
  { label: 'Tailored Blazer', category: 'Outerwear', iconName: 'Layers', bgGradient: 'from-purple-950 to-zinc-900' },
  { label: 'Denim Jacket', category: 'Outerwear', iconName: 'Layers', bgGradient: 'from-cyan-950 to-zinc-900' },
  { label: 'Classic Watch', category: 'Accessories', iconName: 'Tag', bgGradient: 'from-yellow-950 to-zinc-900' },
  { label: 'Leather Bag', category: 'Accessories', iconName: 'Tag', bgGradient: 'from-rose-950 to-zinc-900' },
  { label: 'Evening Dress', category: 'Dresses', iconName: 'Sparkles', bgGradient: 'from-pink-950 to-zinc-900' },
];

// Occasion badge color mapper
function getOccasionColor(occasion: string) {
  switch (occasion.toLowerCase()) {
    case 'date night':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'party':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'formal':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'college':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'work':
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    case 'athletic':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    default:
      return 'bg-zinc-800 text-zinc-300 border-white/10';
  }
}

export const WardrobeDashboard: React.FC<WardrobeDashboardProps> = ({
  profile,
  partnerProfile,
  items,
  outfits,
  onSaveItem,
  onDeleteItem,
  onSaveOutfit,
  onDeleteOutfit,
}) => {
  // Main view toggle: Closet vs Fits
  const [activeTab, setActiveTab] = useState<'closet' | 'fits' | 'builder'>('closet');

  // Filters for Closet Inventory
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedOccasionFilter, setSelectedOccasionFilter] = useState<string>('All');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('All');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'me' | 'partner' | 'shared'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Item Modal State (Add / Edit)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<WardrobeCategory>('Tops');
  const [formBrand, setFormBrand] = useState('');
  const [formColor, setFormColor] = useState('Black');
  const [formSize, setFormSize] = useState('M');
  const [formSeason, setFormSeason] = useState<WardrobeSeason>('All Season');
  const [formOccasion, setFormOccasion] = useState<WardrobeOccasion>('Casual');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [formOwnerSlot, setFormOwnerSlot] = useState<ProductOwnerSlot>(profile.slot);
  const [itemSaving, setItemSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Outfit Builder State
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [outfitName, setOutfitName] = useState('');
  const [outfitOccasion, setOutfitOccasion] = useState<WardrobeOccasion>('Casual');
  const [outfitSelectedIds, setOutfitSelectedIds] = useState<string[]>([]);
  const [outfitNotes, setOutfitNotes] = useState('');
  const [outfitOwnerSlot, setOutfitOwnerSlot] = useState<ProductOwnerSlot>(profile.slot);
  const [outfitSaving, setOutfitSaving] = useState(false);
  const [builderCategoryFilter, setBuilderCategoryFilter] = useState<string>('All');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2200);
  };

  // Filtered wardrobe items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (selectedOccasionFilter !== 'All' && item.occasion !== selectedOccasionFilter) return false;
      if (selectedColorFilter !== 'All' && !item.color.toLowerCase().includes(selectedColorFilter.toLowerCase()))
        return false;

      if (ownerFilter === 'me') {
        if (item.profileSlot !== profile.slot) return false;
      } else if (ownerFilter === 'partner') {
        if (item.profileSlot !== partnerProfile.slot) return false;
      } else if (ownerFilter === 'shared') {
        if (item.profileSlot !== 'shared') return false;
      } else {
        // 'all' in active profile's view shows this profile's items + shared items
        if (item.profileSlot !== profile.slot && item.profileSlot !== 'shared') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchBrand = item.brand.toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        const matchColor = item.color.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchNotes && !matchColor) return false;
      }
      return true;
    });
  }, [items, selectedCategory, selectedOccasionFilter, selectedColorFilter, ownerFilter, searchQuery, profile.slot, partnerProfile.slot]);

  // Filtered outfits
  const filteredOutfits = useMemo(() => {
    return outfits.filter((outfit) => {
      if (ownerFilter === 'me') {
        if (outfit.profileSlot !== profile.slot) return false;
      } else if (ownerFilter === 'partner') {
        if (outfit.profileSlot !== partnerProfile.slot) return false;
      } else if (ownerFilter === 'shared') {
        if (outfit.profileSlot !== 'shared') return false;
      } else {
        // 'all' in active profile's view shows this profile's outfits + shared outfits
        if (outfit.profileSlot !== profile.slot && outfit.profileSlot !== 'shared') return false;
      }
      return true;
    });
  }, [outfits, ownerFilter, profile.slot, partnerProfile.slot]);

  // Helper map of wardrobe items by ID
  const itemsById = useMemo(() => {
    const map = new Map<string, WardrobeItemDoc>();
    items.forEach((it) => map.set(it.id, it));
    return map;
  }, [items]);

  // Statistics for Saved Fits overview
  const fitsStats = useMemo(() => {
    const totalFits = filteredOutfits.length;
    const uniquePieces = new Set<string>();
    const occasionCounts: Record<string, number> = {};

    filteredOutfits.forEach((fit) => {
      (fit.itemIds || []).forEach((id) => uniquePieces.add(id));
      if (fit.occasion) {
        occasionCounts[fit.occasion] = (occasionCounts[fit.occasion] || 0) + 1;
      }
    });

    let topOccasion = 'Versatile';
    let maxCount = 0;
    Object.entries(occasionCounts).forEach(([occ, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topOccasion = occ;
      }
    });

    return {
      totalFits,
      piecesStyled: uniquePieces.size,
      topOccasion,
    };
  }, [filteredOutfits]);

  // Items filtered for outfit builder closet selector
  const builderFilteredItems = useMemo(() => {
    if (builderCategoryFilter === 'All') return items;
    return items.filter((item) => item.category === builderCategoryFilter);
  }, [items, builderCategoryFilter]);

  // Handle client-side image compression and cloud object storage upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          // Show instant local preview
          setFormImageUrl(dataUrl);
          setIsUploadingPhoto(true);

          try {
            const wsId = items[0]?.workspaceId || 'shared';
            const uploadRes = await api.upload.uploadImage(dataUrl, file.name, wsId);
            setFormImageUrl(uploadRes.imageUrl);
            setFormThumbnailUrl(uploadRes.thumbnailUrl);
            showToast('Photo uploaded to cloud storage!');
          } catch (uploadErr) {
            console.warn('Cloud upload notice:', uploadErr);
          } finally {
            setIsUploadingPhoto(false);
          }
        }
      };
      img.src = loadEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddItem = () => {
    setEditingItemId(null);
    setFormName('');
    setFormCategory('Tops');
    setFormBrand('');
    setFormColor('Black');
    setFormSize('M');
    setFormSeason('All Season');
    setFormOccasion('Casual');
    setFormImageUrl('');
    setFormThumbnailUrl('');
    setFormNotes('');
    setFormOwnerSlot(profile.slot);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: WardrobeItemDoc) => {
    setEditingItemId(item.id);
    setFormName(item.name);
    setFormCategory(item.category as WardrobeCategory);
    setFormBrand(item.brand || '');
    setFormColor(item.color || 'Black');
    setFormSize(item.size || 'M');
    setFormSeason(item.season as WardrobeSeason);
    setFormOccasion(item.occasion as WardrobeOccasion);
    setFormImageUrl(item.imageUrl || '');
    setFormThumbnailUrl(item.thumbnailUrl || item.imageUrl || '');
    setFormNotes(item.notes || '');
    setFormOwnerSlot(item.profileSlot);
    setIsItemModalOpen(true);
  };

  const handleSaveItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter a clothing item name');
      return;
    }
    setItemSaving(true);
    try {
      await onSaveItem(
        {
          name: formName.trim().slice(0, 100),
          category: formCategory,
          brand: formBrand.trim().slice(0, 80),
          color: formColor.slice(0, 40),
          size: formSize.slice(0, 20),
          season: formSeason,
          occasion: formOccasion,
          imageUrl: formImageUrl,
          thumbnailUrl: formThumbnailUrl || formImageUrl,
          notes: formNotes.trim().slice(0, 500),
          profileSlot: formOwnerSlot,
        },
        editingItemId || undefined
      );
      setIsItemModalOpen(false);
      if (formOwnerSlot === partnerProfile.slot) {
        showToast(`Saved to ${partnerProfile.name}’s closet`);
      } else if (formOwnerSlot === 'shared') {
        showToast('Saved as Shared Piece');
      } else {
        showToast(editingItemId ? 'Item updated in wardrobe' : 'Item added to your wardrobe!');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving item. Please try again.');
    } finally {
      setItemSaving(false);
    }
  };

  // Outfit Builder Actions
  const handleStartOutfitBuilder = (existingOutfit?: OutfitDoc) => {
    if (existingOutfit) {
      setEditingOutfitId(existingOutfit.id);
      setOutfitName(existingOutfit.name);
      setOutfitOccasion((existingOutfit.occasion as WardrobeOccasion) || 'Casual');
      setOutfitSelectedIds(existingOutfit.itemIds || []);
      setOutfitNotes(existingOutfit.notes || '');
      setOutfitOwnerSlot(existingOutfit.profileSlot);
    } else {
      setEditingOutfitId(null);
      setOutfitName('');
      setOutfitOccasion('Casual');
      setOutfitSelectedIds([]);
      setOutfitNotes('');
      setOutfitOwnerSlot(profile.slot);
    }
    setActiveTab('builder');
  };

  const handleToggleItemInOutfit = (itemId: string) => {
    setOutfitSelectedIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      }
      if (prev.length >= 30) {
        showToast('Maximum 30 items per outfit');
        return prev;
      }
      return [...prev, itemId];
    });
  };

  const handleSaveOutfitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outfitName.trim()) {
      showToast('Please give your outfit a name');
      return;
    }
    if (outfitSelectedIds.length === 0) {
      showToast('Please select at least 1 clothing item for this fit');
      return;
    }

    setOutfitSaving(true);
    try {
      await onSaveOutfit(
        {
          name: outfitName.trim().slice(0, 100),
          occasion: outfitOccasion,
          itemIds: outfitSelectedIds,
          notes: outfitNotes.trim().slice(0, 500),
          profileSlot: outfitOwnerSlot,
        },
        editingOutfitId || undefined
      );
      if (outfitOwnerSlot === partnerProfile.slot) {
        showToast(`Saved to ${partnerProfile.name}’s fits`);
      } else if (outfitOwnerSlot === 'shared') {
        showToast('Saved as Shared Fit');
      } else {
        showToast(editingOutfitId ? 'Outfit updated!' : 'New fit saved to your closet!');
      }
      setActiveTab('fits');
    } catch (err) {
      console.error(err);
      showToast('Failed to save outfit. Please try again.');
    } finally {
      setOutfitSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-12 text-zinc-100">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-18 right-4 sm:right-8 z-50 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-white/20 text-white text-xs font-semibold shadow-2xl flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header & Wardrobe Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 tracking-wide uppercase">
            <Shirt className="w-4 h-4" />
            <span>Digital Wardrobe & Outfit Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
            {profile.name}’s Closet
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Catalog clothing pieces, style combined fits, and coordinate styles with {partnerProfile.name}.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-1 rounded-full bg-[#12141C] border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('closet')}
              className={`min-h-[34px] px-3.5 rounded-full font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'closet' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Closet ({items.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fits')}
              className={`min-h-[34px] px-3.5 rounded-full font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'fits' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Fits ({outfits.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartOutfitBuilder()}
              className={`min-h-[34px] px-3.5 rounded-full font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'builder'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Fit</span>
            </button>
          </div>

          {activeTab === 'closet' && (
            <button
              type="button"
              onClick={handleOpenAddItem}
              className="min-h-[40px] px-4 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-white/5 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              <span>Add Clothing</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CLOSET INVENTORY */}
      {activeTab === 'closet' && (
        <div className="space-y-5">
          {/* Filter Bar: Categories, Occasions, Colors, Search */}
          <div className="rounded-3xl bg-[#12141C] border border-white/10 p-4 space-y-3.5">
            {/* Top row: Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`min-h-[32px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-white border border-white/6'
                }`}
              >
                All Pieces ({items.length})
              </button>
              {WARDROBE_CATEGORIES.map((cat) => {
                const count = items.filter((i) => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[32px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-zinc-900/90 text-zinc-400 hover:text-white border border-white/6'
                    }`}
                  >
                    <span>{cat}</span>
                    {count > 0 && <span className="text-[10px] opacity-75">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Middle row: Owner filter, Occasion, Color, Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
              {/* Search Bar */}
              <div className="sm:col-span-4 relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, brand, color..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-9 pr-3 rounded-2xl bg-zinc-900 border border-white/10 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Occasion Filter */}
              <div className="sm:col-span-3">
                <DuoDropdown
                  value={selectedOccasionFilter}
                  onChange={(val) => setSelectedOccasionFilter(val)}
                  options={[
                    { value: 'All', label: 'All Occasions' },
                    ...WARDROBE_OCCASIONS.map((occ) => ({ value: occ, label: occ })),
                  ]}
                  triggerClassName="!min-h-[44px] !text-xs !rounded-2xl"
                />
              </div>

              {/* Color Filter */}
              <div className="sm:col-span-2">
                <DuoDropdown
                  value={selectedColorFilter}
                  onChange={(val) => setSelectedColorFilter(val)}
                  options={[
                    { value: 'All', label: 'All Colors' },
                    ...PRESET_COLORS.map((c) => ({ value: c.name, label: c.name })),
                  ]}
                  triggerClassName="!min-h-[44px] !text-xs !rounded-2xl"
                />
              </div>

              {/* Profile Ownership Toggle */}
              <div className="sm:col-span-3 flex items-center p-0.5 rounded-2xl bg-zinc-900 border border-white/10 text-xs font-medium min-h-[44px]">
                <button
                  type="button"
                  onClick={() => setOwnerFilter('all')}
                  className={`flex-1 min-h-[38px] rounded-xl text-xs font-semibold truncate px-1.5 transition-colors ${
                    ownerFilter === 'all' ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerFilter('me')}
                  className={`flex-1 min-h-[38px] rounded-xl text-xs font-semibold truncate px-1.5 transition-colors ${
                    ownerFilter === 'me' ? 'bg-sky-500 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {profile.name}
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerFilter('partner')}
                  className={`flex-1 min-h-[38px] rounded-xl text-xs font-semibold truncate px-1.5 transition-colors ${
                    ownerFilter === 'partner' ? 'bg-rose-500 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {partnerProfile.name}
                </button>
              </div>
            </div>
          </div>

          {/* Clothing Items Grid */}
          {filteredItems.length === 0 ? (
            <div className="rounded-3xl bg-[#12141C] border border-white/8 p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-rose-400">
                <Shirt className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No clothing pieces found</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {items.length === 0
                    ? 'Your digital wardrobe is empty. Start adding your tops, bottoms, shoes, and outerwear to build your closet!'
                    : 'No items match your active filters. Try resetting the category, occasion, or search.'}
                </p>
              </div>
              {items.length === 0 ? (
                <button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="min-h-[44px] px-6 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold inline-flex items-center gap-2 transition-all shadow-lg shadow-white/5"
                >
                  <Plus className="w-4 h-4 text-zinc-950" />
                  <span>Add First Clothing Item</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedOccasionFilter('All');
                    setSelectedColorFilter('All');
                    setOwnerFilter('all');
                    setSearchQuery('');
                  }}
                  className="min-h-[36px] px-4 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredItems.map((item) => {
                const ownerLabel =
                  item.profileSlot === 'shared'
                    ? 'Shared'
                    : item.profileSlot === profile.slot
                    ? profile.name
                    : partnerProfile.name;
                const ownerColor =
                  item.profileSlot === 'shared'
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : item.profileSlot === 'partner1'
                    ? 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="group relative rounded-3xl bg-[#12141C] border border-white/10 hover:border-white/20 transition-all overflow-hidden flex flex-col justify-between"
                  >
                    {/* Visual Card Image / Silhouette Banner */}
                    <div className="relative aspect-[4/3] w-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.thumbnailUrl || item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center p-3 text-center space-y-2">
                          <Shirt className="w-8 h-8 text-zinc-600 group-hover:text-rose-400 transition-colors" />
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            {item.category}
                          </span>
                        </div>
                      )}

                      {/* Top Badges: Category & Owner */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white">
                          {item.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${ownerColor}`}>
                          {ownerLabel}
                        </span>
                      </div>

                      {/* Quick Action Overlay (Edit / Delete) */}
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item)}
                          className="w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-zinc-200 hover:text-white flex items-center justify-center"
                          title="Edit Piece"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item.id)}
                          className="w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center"
                          title="Delete Piece"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Item Details */}
                    <div className="p-3.5 space-y-2">
                      <div>
                        {item.brand && (
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate">
                            {item.brand}
                          </div>
                        )}
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-tight mt-0.5">
                          {item.name}
                        </h4>
                      </div>

                      {/* Attribute Pills: Color Swatch, Size, Occasion */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {/* Color Pill */}
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-white/8 text-[10px] text-zinc-300">
                          <span className="w-2 h-2 rounded-full border border-white/20 bg-zinc-400" />
                          <span className="truncate max-w-[70px]">{item.color}</span>
                        </div>

                        {/* Size Pill */}
                        {item.size && (
                          <span className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-white/8 text-[10px] font-mono text-zinc-400">
                            {item.size}
                          </span>
                        )}

                        {/* Occasion Pill */}
                        {item.occasion && (
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${getOccasionColor(item.occasion)}`}>
                            {item.occasion}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 pt-0.5 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED OUTFITS ("FITS") */}
      {activeTab === 'fits' && (
        <div className="space-y-6">
          {/* Section Header & Metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Your Saved Fits</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {filteredOutfits.length}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Complete coordinated looks and styled combinations ready to wear.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleStartOutfitBuilder()}
              className="min-h-[44px] px-5 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-2 active:scale-95 shrink-0 self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span>Create New Fit</span>
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="rounded-2xl bg-[#12141C] border border-white/8 p-3 sm:p-4 space-y-1">
              <span className="text-[10px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider block">
                Total Fits
              </span>
              <span className="text-lg sm:text-2xl font-bold text-white font-mono tabular-nums block">
                {fitsStats.totalFits}
              </span>
            </div>
            <div className="rounded-2xl bg-[#12141C] border border-white/8 p-3 sm:p-4 space-y-1">
              <span className="text-[10px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider block">
                Pieces in Looks
              </span>
              <span className="text-lg sm:text-2xl font-bold text-rose-400 font-mono tabular-nums block">
                {fitsStats.piecesStyled}
              </span>
            </div>
            <div className="rounded-2xl bg-[#12141C] border border-white/8 p-3 sm:p-4 space-y-1">
              <span className="text-[10px] sm:text-xs font-medium text-zinc-400 uppercase tracking-wider block">
                Top Occasion
              </span>
              <span className="text-sm sm:text-lg font-bold text-white truncate block">
                {fitsStats.topOccasion}
              </span>
            </div>
          </div>

          {filteredOutfits.length === 0 ? (
            <div className="rounded-3xl bg-[#12141C] border border-white/8 p-10 sm:p-14 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-rose-400 shadow-xl shadow-rose-500/5">
                <Layers className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-white">No styled outfits yet</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Combine tops, bottoms, shoes, and outerwear from your closet into complete curated looks for any occasion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleStartOutfitBuilder()}
                className="min-h-[44px] px-6 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold inline-flex items-center gap-2 transition-all shadow-lg shadow-white/5 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span>Open Outfit Studio</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOutfits.map((outfit) => {
                const outfitItems = (outfit.itemIds || [])
                  .map((id) => itemsById.get(id))
                  .filter((it): it is WardrobeItemDoc => Boolean(it));

                return (
                  <div
                    key={outfit.id}
                    className="rounded-3xl bg-[#12141C] border border-white/10 hover:border-white/20 p-5 space-y-4 flex flex-col justify-between transition-all duration-200 shadow-xl"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-3 py-1 rounded-full border text-xs font-semibold ${getOccasionColor(
                            outfit.occasion
                          )}`}
                        >
                          {outfit.occasion}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartOutfitBuilder(outfit)}
                            className="min-w-[36px] min-h-[36px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
                            title="Edit Fit"
                            aria-label="Edit Fit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteOutfit(outfit.id)}
                            className="min-w-[36px] min-h-[36px] rounded-xl bg-white/5 hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors active:scale-90"
                            title="Delete Fit"
                            aria-label="Delete Fit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{outfit.name}</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {outfitItems.length} {outfitItems.length === 1 ? 'piece' : 'pieces'} styled
                        </p>
                      </div>

                      {/* Collage / Strip of pieces with smooth image zoom */}
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {outfitItems.slice(0, 4).map((piece) => (
                          <div
                            key={piece.id}
                            className="aspect-square rounded-2xl bg-zinc-950 border border-white/8 overflow-hidden relative group/piece"
                            title={`${piece.category}: ${piece.name}`}
                          >
                            {piece.imageUrl ? (
                              <img
                                src={piece.thumbnailUrl || piece.imageUrl}
                                alt={piece.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover/piece:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-1 text-[9px] text-zinc-500 font-mono text-center">
                                <span>{piece.category.slice(0, 4)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Item Names List */}
                      <div className="space-y-1.5 pt-2 border-t border-white/6">
                        {outfitItems.map((piece) => (
                          <div
                            key={piece.id}
                            className="text-xs text-zinc-300 flex items-center justify-between gap-2"
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                              <span className="text-zinc-500 font-mono text-[10px]">[{piece.category}]</span>
                              <span className="truncate">{piece.name}</span>
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono shrink-0">{piece.brand}</span>
                          </div>
                        ))}
                      </div>

                      {outfit.notes && (
                        <div className="border-l-2 border-rose-500/60 bg-white/2 pl-3 py-1.5 rounded-r-xl">
                          <p className="text-xs text-zinc-400 italic">
                            "{outfit.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OUTFIT BUILDER STUDIO */}
      {activeTab === 'builder' && (
        <form onSubmit={handleSaveOutfitSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {editingOutfitId ? 'Edit Outfit' : 'Create Your Fit'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select items from your closet to arrange and style a coordinated look.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('fits')}
                className="min-h-[44px] px-4 rounded-2xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={outfitSaving}
                className="min-h-[44px] px-5 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-white/5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span>{outfitSaving ? 'Saving Fit...' : 'Save Fit'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Fit Meta Details (Name, Occasion, Notes, Owner) */}
            <div className="lg:col-span-5 rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-white/8">
                <Tag className="w-4 h-4 text-rose-400" />
                <span>Fit Configuration</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Outfit Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunset Rooftop Dinner, Campus Casual..."
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  className="w-full min-h-[44px] px-4 rounded-2xl bg-[#090A0F] border border-white/10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Occasion</label>
                <div className="grid grid-cols-2 gap-2">
                  {WARDROBE_OCCASIONS.map((occ) => (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setOutfitOccasion(occ)}
                      className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between active:scale-95 ${
                        outfitOccasion === occ
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-[#090A0F] text-zinc-400 hover:text-white border border-white/6'
                      }`}
                    >
                      <span>{occ}</span>
                      {outfitOccasion === occ && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Who is this fit for?</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOutfitOwnerSlot(profile.slot)}
                    className={`min-h-[40px] rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      outfitOwnerSlot === profile.slot
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                        : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                    }`}
                  >
                    {profile.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutfitOwnerSlot(partnerProfile.slot)}
                    className={`min-h-[40px] rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      outfitOwnerSlot === partnerProfile.slot
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                    }`}
                  >
                    {partnerProfile.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutfitOwnerSlot('shared')}
                    className={`min-h-[40px] rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      outfitOwnerSlot === 'shared'
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                    }`}
                  >
                    Shared
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Styling Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Roll sleeves, pair with silver necklace, wear with light socks..."
                  value={outfitNotes}
                  onChange={(e) => setOutfitNotes(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-[#090A0F] border border-white/10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400 resize-none transition-colors"
                />
              </div>

              {/* Selected Pieces Counter Preview */}
              <div className="pt-3 border-t border-white/8 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                  <span>Selected Pieces ({outfitSelectedIds.length})</span>
                  {outfitSelectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOutfitSelectedIds([])}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {outfitSelectedIds.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-1">
                    No items selected yet. Tap pieces from the right to build this fit.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar pr-1">
                    {outfitSelectedIds.map((id) => {
                      const piece = itemsById.get(id);
                      if (!piece) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#090A0F] border border-white/6 text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {piece.imageUrl ? (
                              <img
                                src={piece.thumbnailUrl || piece.imageUrl}
                                alt={piece.name}
                                loading="lazy"
                                decoding="async"
                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/6 flex items-center justify-center shrink-0">
                                <Shirt className="w-4 h-4 text-zinc-500" />
                              </div>
                            )}
                            <div className="truncate">
                              <span className="truncate text-white font-medium block">{piece.name}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{piece.category}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleItemInOutfit(id)}
                            className="min-w-[32px] min-h-[32px] rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors shrink-0"
                            aria-label={`Remove ${piece.name}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Interactive Closet Selector */}
            <div className="lg:col-span-7 rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Select Pieces from Closet</h3>
                  <span className="text-xs text-rose-400 font-mono font-semibold">
                    {outfitSelectedIds.length} styled
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Tap any piece below to toggle it in or out of this look.
                </p>

                {/* Category quick filter strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-1">
                  {['All', ...WARDROBE_CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBuilderCategoryFilter(cat)}
                      className={`min-h-[32px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors active:scale-95 ${
                        builderCategoryFilter === cat
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-[#090A0F] text-zinc-400 hover:text-white border border-white/6'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {builderFilteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 bg-[#090A0F] rounded-2xl border border-white/6 space-y-2">
                  <Shirt className="w-6 h-6 text-zinc-600 mx-auto" />
                  <p>No wardrobe items match this category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto no-scrollbar pr-1">
                  {builderFilteredItems.map((item) => {
                    const isSelected = outfitSelectedIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleItemInOutfit(item.id)}
                        className={`relative rounded-2xl p-2.5 text-left border transition-all flex flex-col justify-between active:scale-95 ${
                          isSelected
                            ? 'bg-rose-500/15 border-rose-500 shadow-md ring-2 ring-rose-500/40'
                            : 'bg-[#090A0F] border-white/8 hover:border-white/20'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center z-10 shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}

                        <div className="aspect-[4/3] w-full rounded-xl bg-zinc-950 overflow-hidden mb-2 relative">
                          {item.imageUrl ? (
                            <img
                              src={item.thumbnailUrl || item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Shirt className="w-6 h-6" />
                            </div>
                          )}
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-semibold text-white">
                            {item.category}
                          </span>
                        </div>

                        <div>
                          {item.brand && (
                            <div className="text-[10px] text-zinc-400 font-mono truncate">
                              {item.brand}
                            </div>
                          )}
                          <div className="text-xs font-bold text-white truncate">{item.name}</div>
                          <div className="text-[10px] text-zinc-400">{item.color}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* CLOTHING ITEM ADD / EDIT MODAL */}
      {/* CLOTHING ITEM ADD / EDIT MODAL */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 text-zinc-100 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="shrink-0 p-4 sm:p-5 border-b border-white/10 bg-[#12141C] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Shirt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingItemId ? 'Edit Clothing Item' : 'Add Clothing to Closet'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Record pieces, categories, colors, occasions & images.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  aria-label="Close Clothing Modal"
                  className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body & Form */}
              <form onSubmit={handleSaveItemSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-5 space-y-4 no-scrollbar">
                  {/* Item Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Clothing Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Crisp White Poplin Shirt, Straight Indigo Jeans..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  {/* Category & Brand */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Category *</label>
                      <DuoDropdown
                        value={formCategory}
                        onChange={(val) => setFormCategory(val as WardrobeCategory)}
                        options={WARDROBE_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                        searchable={true}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Brand (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Zara, Uniqlo, Nike, Levi's..."
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {/* Color & Size */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Colour</label>
                      <input
                        type="text"
                        placeholder="e.g. Black, Navy, Off-White..."
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Size</label>
                      <input
                        type="text"
                        placeholder="e.g. M, L, 32/30, 42..."
                        value={formSize}
                        onChange={(e) => setFormSize(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 rounded-2xl bg-zinc-900 border border-white/10 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {/* Occasion & Season */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Occasion</label>
                      <DuoDropdown
                        value={formOccasion}
                        onChange={(val) => setFormOccasion(val as WardrobeOccasion)}
                        options={WARDROBE_OCCASIONS.map((occ) => ({ value: occ, label: occ }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Season</label>
                      <DuoDropdown
                        value={formSeason}
                        onChange={(val) => setFormSeason(val as WardrobeSeason)}
                        options={WARDROBE_SEASONS.map((s) => ({ value: s, label: s }))}
                      />
                    </div>
                  </div>

                  {/* Profile Ownership */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Closet Owner</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormOwnerSlot(profile.slot)}
                        className={`min-h-[44px] rounded-xl text-xs font-semibold transition-colors ${
                          formOwnerSlot === profile.slot
                            ? 'bg-sky-500 text-white'
                            : 'bg-zinc-900 text-zinc-400 border border-white/6'
                        }`}
                      >
                        {profile.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormOwnerSlot(partnerProfile.slot)}
                        className={`min-h-[44px] rounded-xl text-xs font-semibold transition-colors ${
                          formOwnerSlot === partnerProfile.slot
                            ? 'bg-rose-500 text-white'
                            : 'bg-zinc-900 text-zinc-400 border border-white/6'
                        }`}
                      >
                        {partnerProfile.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormOwnerSlot('shared')}
                        className={`min-h-[44px] rounded-xl text-xs font-semibold transition-colors ${
                          formOwnerSlot === 'shared'
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border border-white/6'
                        }`}
                      >
                        Shared
                      </button>
                    </div>
                  </div>

                  {/* Clothing Photo / Image Upload or URL */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Clothing Image</label>
                    <div className="flex items-center gap-3">
                      {/* Thumbnail preview */}
                      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {formImageUrl ? (
                          <img
                            src={formImageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-zinc-600" />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="w-full min-h-[44px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                              <span>Uploading to Cloud Storage...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Photo from Device</span>
                            </>
                          )}
                        </button>

                        <input
                          type="url"
                          placeholder="Or paste image web link..."
                          value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                          onChange={(e) => setFormImageUrl(e.target.value)}
                          className="w-full min-h-[44px] px-3 rounded-xl bg-zinc-900 border border-white/10 text-base sm:text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Notes & Fit Advice</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Dry clean only, oversized fit, goes best with Chelsea boots..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-zinc-900 border border-white/10 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400 resize-none"
                    />
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="shrink-0 p-4 border-t border-white/10 bg-[#12141C] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsItemModalOpen(false)}
                    className="min-h-[44px] px-4 rounded-2xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={itemSaving}
                    className="min-h-[44px] px-6 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-lg shadow-white/5"
                  >
                    {itemSaving ? 'Saving...' : editingItemId ? 'Save Changes' : 'Add to Closet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

