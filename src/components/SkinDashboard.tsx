import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplet,
  Edit3,
  FolderPlus,
  Layers,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import {
  CareProductDoc,
  CareSegment,
  formatShortDate,
  getDayDisplayName,
  getWeekdayFromDate,
  PartnerProfileView,
  ProductOwnerSlot,
  ProductStatus,
  RoutineCompletionDoc,
  RoutineTime,
  WEEKDAY_OPTIONS,
  WeekDay,
} from '../types';

interface SkinDashboardProps {
  profile: PartnerProfileView;
  partnerProfile: PartnerProfileView;
  currency: string;
  todayDate: string;
  products: CareProductDoc[];
  routineCompletionsMap: Record<string, RoutineCompletionDoc>;
  skincareCategories: string[];
  haircareCategories: string[];
  bodycareCategories: string[];
  onSaveProduct: (
    product: Omit<CareProductDoc, 'id' | 'workspaceId' | 'updatedByUid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onToggleRoutineCompletion: (productId: string, date: string, completed: boolean) => Promise<void>;
  onAddSubCategory: (segment: CareSegment, categoryName: string) => Promise<void>;
  onRemoveSubCategory: (segment: CareSegment, categoryName: string) => Promise<void>;
}

const SEGMENT_META: Record<
  CareSegment,
  {
    title: string;
    subtitle: string;
    accentText: string;
    accentBg: string;
    accentBorder: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  skincare: {
    title: 'Skincare',
    subtitle: 'Cleansers, serums, moisturizers & SPF essentials',
    accentText: 'text-rose-400',
    accentBg: 'bg-rose-500',
    accentBorder: 'border-rose-500/40',
    icon: Sparkles,
  },
  haircare: {
    title: 'Haircare',
    subtitle: 'Shampoos, masks, scalp oils & styling treatments',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500',
    accentBorder: 'border-amber-500/40',
    icon: Wind,
  },
  bodycare: {
    title: 'Bodycare',
    subtitle: 'Body washes, lotions, scrubs & daily body care',
    accentText: 'text-sky-400',
    accentBg: 'bg-sky-400',
    accentBorder: 'border-sky-400/40',
    icon: Droplet,
  },
};

const STATUS_LABELS: Record<ProductStatus, string> = {
  in_use: 'In Use',
  unopened: 'Unopened Backup',
  finished: 'Finished',
};

const ROUTINE_LABELS: Record<RoutineTime, string> = {
  am: 'AM Routine',
  pm: 'PM Routine',
  both: 'AM & PM',
  weekly: 'Weekly Care',
};

export const SkinDashboard: React.FC<SkinDashboardProps> = ({
  profile,
  partnerProfile,
  currency,
  todayDate,
  products,
  routineCompletionsMap,
  skincareCategories,
  haircareCategories,
  bodycareCategories,
  onSaveProduct,
  onDeleteProduct,
  onToggleRoutineCompletion,
  onAddSubCategory,
  onRemoveSubCategory,
}) => {
  const [activeSegment, setActiveSegment] = useState<CareSegment>('skincare');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<'active_profile' | 'shared' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Weekly Routine Checklist Date State
  const [selectedRoutineDate, setSelectedRoutineDate] = useState<string>(todayDate);

  // Sub-category creation modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  // Product Editor Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | undefined>(undefined);
  const [formSegment, setFormSegment] = useState<CareSegment>('skincare');
  const [formSubCategory, setFormSubCategory] = useState<string>('Cleanser');
  const [formProfileSlot, setFormProfileSlot] = useState<ProductOwnerSlot>(profile.slot);
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formQuantity, setFormQuantity] = useState<string>('1');
  const [formOrderedDate, setFormOrderedDate] = useState('');
  const [formOpenedDate, setFormOpenedDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formSaleInfo, setFormSaleInfo] = useState('');
  const [formPricePaid, setFormPricePaid] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState('');
  const [formStatus, setFormStatus] = useState<ProductStatus>('in_use');

  // Custom Weekly Scheduling State
  const [formScheduleType, setFormScheduleType] = useState<'daily' | 'weekly'>('daily');
  const [formScheduledDays, setFormScheduledDays] = useState<WeekDay[]>(['wednesday', 'sunday']);
  const [formTimeOfDay, setFormTimeOfDay] = useState<'am' | 'pm' | 'both'>('both');

  const [formNotes, setFormNotes] = useState('');
  const [productSaving, setProductSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleToggleWeekday = (day: WeekDay) => {
    setFormScheduledDays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2000);
  };

  const categoriesBySegment: Record<CareSegment, string[]> = useMemo(
    () => ({
      skincare: skincareCategories,
      haircare: haircareCategories,
      bodycare: bodycareCategories,
    }),
    [skincareCategories, haircareCategories, bodycareCategories]
  );

  const activeCategories = categoriesBySegment[activeSegment] || [];

  // Open Product Modal for New Product
  const handleOpenAddProduct = (segmentOverride?: CareSegment, subCatOverride?: string) => {
    const targetSeg = segmentOverride ?? activeSegment;
    const segCats = categoriesBySegment[targetSeg] || ['General'];
    const defaultCat =
      subCatOverride && subCatOverride !== 'all' ? subCatOverride : segCats[0] || 'Cleanser';

    setEditingProductId(undefined);
    setFormSegment(targetSeg);
    setFormSubCategory(defaultCat);
    setFormProfileSlot(profile.slot);
    setFormName('');
    setFormBrand('');
    setFormQuantity('1');
    setFormOrderedDate('');
    setFormOpenedDate('');
    setFormExpiryDate('');
    setFormSaleInfo('');
    setFormPricePaid('');
    setFormOriginalPrice('');
    setFormStatus('in_use');
    setFormScheduleType('daily');
    setFormScheduledDays(['wednesday', 'sunday']);
    setFormTimeOfDay('both');
    setFormNotes('');
    setIsProductModalOpen(true);
  };

  // Open Product Modal for Editing
  const handleOpenEditProduct = (prod: CareProductDoc) => {
    setEditingProductId(prod.id);
    setFormSegment(prod.segment);
    setFormSubCategory(prod.subCategory);
    setFormProfileSlot(prod.profileSlot);
    setFormName(prod.name);
    setFormBrand(prod.brand);
    setFormQuantity(String(prod.quantity && prod.quantity >= 1 ? prod.quantity : 1));
    setFormOrderedDate(prod.orderedDate);
    setFormOpenedDate(prod.openedDate);
    setFormExpiryDate(prod.expiryDate);
    setFormSaleInfo(prod.saleInfo);
    setFormPricePaid(String(prod.pricePaid || ''));
    setFormOriginalPrice(prod.originalPrice > 0 ? String(prod.originalPrice) : '');
    setFormStatus(prod.status);

    const isWeekly = prod.scheduleType === 'weekly' || prod.routineTime === 'weekly';
    setFormScheduleType(isWeekly ? 'weekly' : 'daily');
    setFormScheduledDays(
      prod.scheduledDays && prod.scheduledDays.length > 0
        ? prod.scheduledDays
        : ['wednesday', 'sunday']
    );
    setFormTimeOfDay(
      prod.routineTime === 'weekly'
        ? 'both'
        : (prod.routineTime as 'am' | 'pm' | 'both') || 'both'
    );
    setFormNotes(prod.notes);
    setIsProductModalOpen(true);
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBrand.trim()) return;
    setProductSaving(true);
    try {
      const paid = Math.max(0, Math.min(1000000, parseFloat(formPricePaid) || 0));
      const orig = Math.max(0, Math.min(1000000, parseFloat(formOriginalPrice) || 0));
      const qty = Math.max(1, Math.min(999, parseInt(formQuantity || '1', 10) || 1));

      const segCats = categoriesBySegment[formSegment] || [];
      const cleanSubCat = formSubCategory.trim() || segCats[0] || 'Essentials';
      if (!segCats.includes(cleanSubCat)) {
        await onAddSubCategory(formSegment, cleanSubCat);
      }

      await onSaveProduct(
        {
          profileSlot: formProfileSlot,
          segment: formSegment,
          subCategory: cleanSubCat,
          name: formName.trim(),
          brand: formBrand.trim(),
          quantity: qty,
          orderedDate: formOrderedDate.trim(),
          openedDate: formOpenedDate.trim(),
          expiryDate: formExpiryDate.trim(),
          saleInfo: formSaleInfo.trim(),
          pricePaid: Math.round(paid * 100) / 100,
          originalPrice: Math.round(orig * 100) / 100,
          status: formStatus,
          scheduleType: formScheduleType,
          scheduledDays: formScheduleType === 'weekly' ? formScheduledDays : [],
          routineTime: formScheduleType === 'weekly' ? 'weekly' : formTimeOfDay,
          notes: formNotes.trim(),
        },
        editingProductId
      );

      setIsProductModalOpen(false);
      setActiveSegment(formSegment);
      showToast(editingProductId ? 'Product updated' : 'Product added to inventory');
    } finally {
      setProductSaving(false);
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newCategoryName.trim().slice(0, 50);
    if (!cleaned) return;
    setCategorySaving(true);
    try {
      await onAddSubCategory(activeSegment, cleaned);
      setNewCategoryName('');
      setSelectedSubCategory(cleaned);
      showToast(`Added "${cleaned}" to ${SEGMENT_META[activeSegment].title}`);
    } finally {
      setCategorySaving(false);
    }
  };

  // Compute stats for each of the 3 Macro Cards (Skincare, Haircare, Bodycare)
  const segmentSummaries = useMemo(() => {
    const map: Record<
      CareSegment,
      {
        totalCount: number;
        totalUnits: number;
        inUseCount: number;
        unopenedCount: number;
        totalPaid: number;
        totalSaved: number;
      }
    > = {
      skincare: { totalCount: 0, totalUnits: 0, inUseCount: 0, unopenedCount: 0, totalPaid: 0, totalSaved: 0 },
      haircare: { totalCount: 0, totalUnits: 0, inUseCount: 0, unopenedCount: 0, totalPaid: 0, totalSaved: 0 },
      bodycare: { totalCount: 0, totalUnits: 0, inUseCount: 0, unopenedCount: 0, totalPaid: 0, totalSaved: 0 },
    };

    for (const p of products) {
      if (ownerFilter === 'active_profile' && p.profileSlot !== profile.slot && p.profileSlot !== 'shared') {
        continue;
      }
      if (ownerFilter === 'shared' && p.profileSlot !== 'shared') {
        continue;
      }
      const bucket = map[p.segment];
      if (!bucket) continue;
      const qty = p.quantity && p.quantity >= 1 ? p.quantity : 1;
      bucket.totalCount += 1;
      bucket.totalUnits += qty;
      if (p.status === 'in_use') bucket.inUseCount += 1;
      if (p.status === 'unopened') bucket.unopenedCount += 1;
      bucket.totalPaid += p.pricePaid || 0;
      if (p.originalPrice > p.pricePaid) {
        bucket.totalSaved += p.originalPrice - p.pricePaid;
      }
    }
    return map;
  }, [products, ownerFilter, profile.slot]);

  // Filtered products for the active segment
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.segment === activeSegment)
      .filter((p) => {
        if (ownerFilter === 'active_profile') {
          return p.profileSlot === profile.slot || p.profileSlot === 'shared';
        }
        if (ownerFilter === 'shared') {
          return p.profileSlot === 'shared';
        }
        return true;
      })
      .filter((p) => {
        if (selectedSubCategory !== 'all' && p.subCategory !== selectedSubCategory) {
          return false;
        }
        if (statusFilter !== 'all' && p.status !== statusFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.subCategory.toLowerCase().includes(q) ||
            p.saleInfo.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [
    products,
    activeSegment,
    ownerFilter,
    profile.slot,
    selectedSubCategory,
    statusFilter,
    searchQuery,
  ]);

  const getOwnerLabel = (slot: ProductOwnerSlot) => {
    if (slot === 'shared') return 'Shared Essential';
    if (slot === profile.slot) return `${profile.name}’s Routine`;
    return `${partnerProfile.name}’s Routine`;
  };

  const currentWeekday = useMemo(() => getWeekdayFromDate(selectedRoutineDate), [selectedRoutineDate]);
  const currentDayDisplay = useMemo(() => getDayDisplayName(selectedRoutineDate), [selectedRoutineDate]);

  // Filter scheduled weekly products for the active profile & current weekday
  const scheduledWeeklyProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Must be in_use (finished and unopened must NOT appear)
      if (p.status !== 'in_use') return false;

      // 2. Profile ownership check (active profile or shared)
      if (p.profileSlot !== profile.slot && p.profileSlot !== 'shared') return false;

      // 3. Daily products must NOT appear in the weekly scheduled-products checklist
      const isWeekly =
        p.scheduleType === 'weekly' || (p.routineTime === 'weekly' && p.scheduleType !== 'daily');
      if (!isWeekly) return false;

      // 4. Weekly products appear only on their selected weekdays
      const days = p.scheduledDays && p.scheduledDays.length > 0 ? p.scheduledDays : [];
      return days.includes(currentWeekday);
    });
  }, [products, profile.slot, currentWeekday]);

  // Sort products: pending items first, completed items moved to the bottom
  const sortedWeeklyProducts = useMemo(() => {
    return [...scheduledWeeklyProducts].sort((a, b) => {
      const aDone = Boolean(routineCompletionsMap[`${profile.slot}_${a.id}_${selectedRoutineDate}`]?.completed);
      const bDone = Boolean(routineCompletionsMap[`${profile.slot}_${b.id}_${selectedRoutineDate}`]?.completed);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }, [scheduledWeeklyProducts, routineCompletionsMap, profile.slot, selectedRoutineDate]);

  const completedCount = useMemo(() => {
    return scheduledWeeklyProducts.filter((p) => {
      const key = `${profile.slot}_${p.id}_${selectedRoutineDate}`;
      return Boolean(routineCompletionsMap[key]?.completed);
    }).length;
  }, [scheduledWeeklyProducts, routineCompletionsMap, profile.slot, selectedRoutineDate]);

  return (
    <div className="space-y-5 sm:space-y-6 pb-24 sm:pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl bg-[#12141C] border border-white/8 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="font-medium text-amber-400">Routine & Inventory Shelf</span>
            <span aria-hidden="true">·</span>
            <span>Skincare · Haircare · Bodycare</span>
            {toastMsg && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {toastMsg}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Personal Care Inventory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Track ordered dates, opened dates, expiry timelines, bulk quantities, sale deals, and prices paid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Owner Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-900 border border-white/10">
            <button
              type="button"
              onClick={() => setOwnerFilter('all')}
              className={`min-h-[36px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                ownerFilter === 'all'
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setOwnerFilter('active_profile')}
              className={`min-h-[36px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                ownerFilter === 'active_profile'
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {profile.name}’s Shelf
            </button>
            <button
              type="button"
              onClick={() => setOwnerFilter('shared')}
              className={`min-h-[36px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                ownerFilter === 'shared'
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Shared Only
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddProduct(activeSegment, selectedSubCategory)}
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-lg shadow-white/5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 1. CUSTOM WEEKLY SKINCARE & HAIRCARE ROUTINE TRACKER */}
      <div className="rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 space-y-4">
        {/* Tracker Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                Weekly Scheduled Routine Tracker
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>{currentDayDisplay}’s Routine</span>
              <span className="text-xs font-mono font-normal text-zinc-400">
                ({formatShortDate(selectedRoutineDate)})
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Only showing products scheduled for {currentDayDisplay}. Completed products automatically move to the bottom.
            </p>
          </div>

          {/* Date Navigator & Completion Counter */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Completion Pill */}
            <div className="px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono font-medium text-zinc-300">
              <span className={completedCount === scheduledWeeklyProducts.length && scheduledWeeklyProducts.length > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {completedCount}
              </span>
              <span className="text-zinc-500"> / </span>
              <span>{scheduledWeeklyProducts.length}</span>
              <span className="text-zinc-500 ml-1 text-[11px]">Done</span>
            </div>

            {/* Date Navigator Controls */}
            <div className="flex items-center p-0.5 rounded-2xl bg-zinc-900 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedRoutineDate.split('-').map(Number);
                  const prev = new Date(y, m - 1, d - 1);
                  setSelectedRoutineDate(
                    `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(
                      prev.getDate()
                    ).padStart(2, '0')}`
                  );
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedRoutineDate(todayDate)}
                className={`px-2.5 h-8 rounded-xl text-xs font-semibold transition-colors ${
                  selectedRoutineDate === todayDate
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedRoutineDate.split('-').map(Number);
                  const next = new Date(y, m - 1, d + 1);
                  setSelectedRoutineDate(
                    `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
                      next.getDate()
                    ).padStart(2, '0')}`
                  );
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Checklist items */}
        {sortedWeeklyProducts.length === 0 ? (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/6 text-center space-y-2">
            <Clock className="w-6 h-6 text-zinc-500 mx-auto" />
            <div className="text-xs font-medium text-zinc-300">
              No weekly products scheduled for {currentDayDisplay}
            </div>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Daily products are excluded from this weekly checklist. When adding or editing a product, select "Weekly" and choose {currentDayDisplay} to track it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedWeeklyProducts.map((p) => {
              const compKey = `${profile.slot}_${p.id}_${selectedRoutineDate}`;
              const isCompleted = Boolean(routineCompletionsMap[compKey]?.completed);
              const segmentMeta = SEGMENT_META[p.segment];

              return (
                <div
                  key={p.id}
                  className={`group rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-zinc-900/40 border-white/6 opacity-75'
                      : 'bg-zinc-900/90 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Left: Checkbox & Name */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleRoutineCompletion(p.id, selectedRoutineDate, !isCompleted)}
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/20'
                          : 'border-white/20 hover:border-white/40 bg-zinc-950 text-transparent'
                      }`}
                      title={isCompleted ? 'Click to undo completion' : 'Click to complete'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold truncate ${
                            isCompleted ? 'line-through text-zinc-400' : 'text-white'
                          }`}
                        >
                          {p.name}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">({p.brand})</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-0.5">
                        <span className={`font-medium ${segmentMeta.accentText}`}>
                          {p.subCategory}
                        </span>
                        <span>·</span>
                        <span>{p.routineTime === 'both' ? 'AM & PM' : `${p.routineTime.toUpperCase()} Routine`}</span>
                        <span>·</span>
                        <span>
                          Days: {(p.scheduledDays || []).map((d) => d.slice(0, 3)).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Pill & Edit Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Completed</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenEditProduct(p)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                      title="Edit Product Schedule"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3 PRIMARY MACRO CARDS: SKINCARE, HAIRCARE, BODYCARE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['skincare', 'haircare', 'bodycare'] as CareSegment[]).map((seg) => {
          const meta = SEGMENT_META[seg];
          const stats = segmentSummaries[seg];
          const IconComponent = meta.icon;
          const isSelected = activeSegment === seg;
          const segCategories = categoriesBySegment[seg] || [];

          return (
            <div
              key={seg}
              onClick={() => {
                setActiveSegment(seg);
                setSelectedSubCategory('all');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setActiveSegment(seg);
                  setSelectedSubCategory('all');
                }
              }}
              className={`rounded-3xl p-5 transition-all cursor-pointer border text-left flex flex-col justify-between space-y-4 ${
                isSelected
                  ? `bg-[#161924] ${meta.accentBorder} shadow-xl`
                  : 'bg-[#12141C] border-white/8 hover:border-white/15'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <IconComponent className={`w-5 h-5 ${meta.accentText}`} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{meta.title}</h2>
                      <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                        {stats.inUseCount} In Use · {stats.unopenedCount} Backup
                        {stats.totalUnits > stats.totalCount
                          ? ` · ${stats.totalUnits} Units`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAddProduct(seg);
                    }}
                    className="min-w-[40px] min-h-[40px] rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
                    title={`Add ${meta.title} Product`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{meta.subtitle}</p>
              </div>

              <div className="pt-3 border-t border-white/8 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Routine Spend</span>
                  <span className="font-mono tabular-nums font-semibold text-white">
                    {currency}
                    {stats.totalPaid.toLocaleString()}
                    {stats.totalSaved > 0 && (
                      <span className="text-emerald-400 ml-1.5 text-[11px]">
                        (Saved {currency}
                        {stats.totalSaved.toLocaleString()})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{segCategories.length} Categories</span>
                  <span className={isSelected ? meta.accentText : 'text-zinc-500'}>
                    {isSelected ? 'Viewing Segment' : 'Tap to View'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-Category Filter Strip + Custom Category Manager */}
      <div className="rounded-3xl bg-[#12141C] border border-white/8 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className={`w-4 h-4 ${SEGMENT_META[activeSegment].accentText}`} />
            <h3 className="text-sm font-semibold text-white">
              {SEGMENT_META[activeSegment].title} Categories
            </h3>
            <span className="text-xs text-zinc-400 font-mono tabular-nums">
              ({filteredProducts.length} items)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add / Edit Categories</span>
            </button>
          </div>
        </div>

        {/* Scrollable Sub-Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedSubCategory('all')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedSubCategory === 'all'
                ? 'bg-white text-zinc-950 font-semibold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/6'
            }`}
          >
            All {SEGMENT_META[activeSegment].title}
          </button>

          {activeCategories.map((cat) => {
            const countInCat = products.filter(
              (p) => p.segment === activeSegment && p.subCategory === cat
            ).length;
            const isSelected = selectedSubCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedSubCategory(cat)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-zinc-950 font-semibold'
                    : 'bg-zinc-900 text-zinc-300 hover:text-white border border-white/6'
                }`}
              >
                <span>{cat}</span>
                {countInCat > 0 && (
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isSelected ? 'text-zinc-700' : 'text-zinc-500'
                    }`}
                  >
                    {countInCat}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter Row */}
        <div className="pt-3 border-t border-white/8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${SEGMENT_META[activeSegment].title.toLowerCase()} by name, brand, category, or sale...`}
              className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl pl-10 pr-4 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090A0F] border border-white/10 overflow-x-auto no-scrollbar">
            {(['all', 'in_use', 'unopened', 'finished'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === st
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st === 'all' ? 'All Status' : STATUS_LABELS[st]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editable Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl bg-[#12141C] border border-white/8 p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-semibold text-white">
              No {SEGMENT_META[activeSegment].title} Products Logged Yet
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Add your cleansers, moisturizers, serums, shampoos, or body essentials with bulk quantities, order date, open date, expiry date, sale deal, and price paid.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAddProduct(activeSegment, selectedSubCategory)}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First {SEGMENT_META[activeSegment].title} Essential</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const qty = prod.quantity && prod.quantity >= 1 ? prod.quantity : 1;
            const discountAmount =
              prod.originalPrice > prod.pricePaid ? prod.originalPrice - prod.pricePaid : 0;
            const discountPct =
              prod.originalPrice > prod.pricePaid && prod.originalPrice > 0
                ? Math.round(((prod.originalPrice - prod.pricePaid) / prod.originalPrice) * 100)
                : 0;

            return (
              <article
                key={prod.id}
                onClick={() => handleOpenEditProduct(prod)}
                className="rounded-3xl bg-[#12141C] hover:bg-[#161924] border border-white/8 hover:border-white/18 p-5 flex flex-col justify-between space-y-4 transition-all cursor-pointer group"
              >
                <div className="space-y-3">
                  {/* Unboxed Metadata Kicker (Zero-Pill Discipline) */}
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`font-medium ${SEGMENT_META[prod.segment].accentText}`}>
                        {prod.subCategory}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {prod.scheduleType === 'weekly' || prod.routineTime === 'weekly'
                          ? `Weekly (${
                              prod.scheduledDays && prod.scheduledDays.length > 0
                                ? prod.scheduledDays
                                    .map(
                                      (d) =>
                                        d.slice(0, 3).charAt(0).toUpperCase() +
                                        d.slice(1, 3)
                                    )
                                    .join(', ')
                                : 'Custom'
                            })`
                          : ROUTINE_LABELS[prod.routineTime] || 'Daily'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          prod.status === 'in_use'
                            ? 'text-emerald-400'
                            : prod.status === 'unopened'
                            ? 'text-amber-400'
                            : 'text-zinc-500'
                        }
                      >
                        {STATUS_LABELS[prod.status]}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditProduct(prod);
                      }}
                      className="min-w-[36px] min-h-[36px] -mr-1 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-white hover:bg-white/8 transition-colors shrink-0"
                      aria-label={`Edit ${prod.name}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Product Title, Brand & Conditional Bulk Quantity ( ONLY shown when qty >= 2 ) */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-400 truncate">
                        {prod.brand}
                      </span>
                      {qty >= 2 && (
                        <span className="text-xs font-mono tabular-nums font-semibold text-amber-300 shrink-0">
                          ×{qty} Bulk Qty
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white leading-snug mt-0.5">
                      {prod.name}
                    </h4>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      {getOwnerLabel(prod.profileSlot)}
                    </div>
                  </div>

                  {/* Price Paid & Sale Details */}
                  <div className="rounded-2xl bg-[#090A0F] border border-white/6 p-3 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-zinc-400">
                        {qty >= 2 ? `Price Paid (×${qty})` : 'Price Paid'}
                      </span>
                      <div className="flex items-baseline gap-2 font-mono tabular-nums">
                        <span className="text-base font-bold text-white">
                          {currency}
                          {prod.pricePaid.toLocaleString()}
                        </span>
                        {prod.originalPrice > prod.pricePaid && (
                          <span className="text-xs text-zinc-500 line-through">
                            {currency}
                            {prod.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {(prod.saleInfo || discountAmount > 0) && (
                      <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-white/5">
                        <span className="text-amber-400 flex items-center gap-1 truncate">
                          <Tag className="w-3 h-3 shrink-0" />
                          <span className="truncate">{prod.saleInfo || 'Sale Discount'}</span>
                        </span>
                        {discountPct > 0 && (
                          <span className="font-mono tabular-nums text-emerald-400 shrink-0">
                            {discountPct}% Off
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ordered, Opened & Expiry Lifecycle Dates */}
                <div className="pt-3 border-t border-white/8 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div>
                      <div className="text-[10px] text-zinc-500">Ordered</div>
                      <div className="text-xs font-mono tabular-nums text-zinc-200 mt-0.5">
                        {formatShortDate(prod.orderedDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">Opened</div>
                      <div className="text-xs font-mono tabular-nums text-zinc-200 mt-0.5">
                        {formatShortDate(prod.openedDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">Expiry</div>
                      <div className="text-xs font-mono tabular-nums text-zinc-200 mt-0.5">
                        {formatShortDate(prod.expiryDate)}
                      </div>
                    </div>
                  </div>

                  {prod.notes && (
                    <p className="text-[11px] text-zinc-400 line-clamp-2 pt-1">{prod.notes}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Manage Sub-Categories Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 text-zinc-100 shadow-2xl">
            <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {SEGMENT_META[activeSegment].title} Categories
                </h3>
                <p className="text-xs text-zinc-400">
                  Add custom product types (e.g. Cleanser, Moisturizer, Retinol)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              {/* Switch segment inside category manager */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                {(['skincare', 'haircare', 'bodycare'] as CareSegment[]).map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => setActiveSegment(seg)}
                    className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                      activeSegment === seg
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {SEGMENT_META[seg].title}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddCategorySubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={50}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={`New ${SEGMENT_META[activeSegment].title.toLowerCase()} category...`}
                  className="flex-1 min-h-[44px] bg-[#090A0F] border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={categorySaving || !newCategoryName.trim()}
                  className="min-h-[44px] px-4 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  Add
                </button>
              </form>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {activeCategories.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/6"
                  >
                    <span className="text-xs font-medium text-zinc-200">{cat}</span>
                    {activeCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveSubCategory(activeSegment, cat)}
                        className="text-xs text-zinc-500 hover:text-rose-400 transition-colors px-2 py-1"
                        title={`Remove ${cat}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal Sheet */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 text-zinc-100 shadow-2xl">
            <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {editingProductId ? 'Edit Routine Product' : 'Add Routine Product'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Log quantity, order/open/expiry dates, sale deal, and price paid
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="space-y-4 pt-4">
              {/* Segment Selector */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Care Segment</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                  {(['skincare', 'haircare', 'bodycare'] as CareSegment[]).map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => {
                        setFormSegment(seg);
                        const cats = categoriesBySegment[seg] || ['Essentials'];
                        if (!cats.includes(formSubCategory)) {
                          setFormSubCategory(cats[0] || 'Essentials');
                        }
                      }}
                      className={`min-h-[38px] rounded-lg text-xs font-medium transition-colors ${
                        formSegment === seg
                          ? 'bg-white text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {SEGMENT_META[seg].title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Category & Routine Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Product Category (or type new)
                  </label>
                  <input
                    type="text"
                    list="subcategory-options"
                    maxLength={50}
                    required
                    value={formSubCategory}
                    onChange={(e) => setFormSubCategory(e.target.value)}
                    placeholder="e.g. Cleanser, Moisturizer..."
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm text-white"
                  />
                  <datalist id="subcategory-options">
                    {(categoriesBySegment[formSegment] || []).map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Whose Product?</label>
                  <select
                    value={formProfileSlot}
                    onChange={(e) => setFormProfileSlot(e.target.value as ProductOwnerSlot)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm text-white"
                  >
                    <option value={profile.slot}>{profile.name}</option>
                    <option value={partnerProfile.slot}>{partnerProfile.name}</option>
                    <option value="shared">Shared (Both of Us)</option>
                  </select>
                </div>
              </div>

              {/* Product Name, Brand & Bulk Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs text-zinc-400 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. CeraVe, Cosrx"
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-xs text-zinc-400 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Gentle Cleanser"
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Quantity (Bulk)
                  </label>
                  <div className="flex items-center bg-[#090A0F] border border-white/10 rounded-xl overflow-hidden min-h-[42px]">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseInt(formQuantity || '1', 10) || 1;
                        setFormQuantity(String(Math.max(1, cur - 1)));
                      }}
                      className="w-9 h-[42px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      className="w-full bg-transparent text-center text-sm font-mono tabular-nums font-semibold text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseInt(formQuantity || '1', 10) || 1;
                        setFormQuantity(String(Math.min(999, cur + 1)));
                      }}
                      className="w-9 h-[42px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ordered Date, Opened Date, Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Ordered Date</span>
                  </label>
                  <input
                    type="date"
                    value={formOrderedDate}
                    onChange={(e) => setFormOrderedDate(e.target.value)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Opened Date</span>
                  </label>
                  <input
                    type="date"
                    value={formOpenedDate}
                    onChange={(e) => setFormOpenedDate(e.target.value)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Expiry Date</span>
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-xs font-mono text-white"
                  />
                </div>
              </div>

              {/* Price Paid, MRP & Sale Event */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Price Paid ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1000000"
                    value={formPricePaid}
                    onChange={(e) => setFormPricePaid(e.target.value)}
                    placeholder="e.g. 649"
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Original MRP ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1000000"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    placeholder="e.g. 899"
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-sm font-mono tabular-nums text-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-zinc-400 mb-1">Sale / Offer</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formSaleInfo}
                    onChange={(e) => setFormSaleInfo(e.target.value)}
                    placeholder="e.g. B2G1 / 30% Off"
                    className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-xs text-white"
                  />
                </div>
              </div>

              {/* Status & Schedule Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Inventory Status</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                    {(['in_use', 'unopened', 'finished'] as ProductStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormStatus(st)}
                        className={`min-h-[34px] rounded-lg text-[11px] font-medium transition-colors ${
                          formStatus === st
                            ? 'bg-zinc-800 text-white font-semibold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {st === 'in_use' ? 'In Use' : st === 'unopened' ? 'Unopened' : 'Finished'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Schedule Frequency</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormScheduleType('daily')}
                      className={`min-h-[34px] rounded-lg text-[11px] font-medium transition-colors ${
                        formScheduleType === 'daily'
                          ? 'bg-zinc-800 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Daily Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormScheduleType('weekly')}
                      className={`min-h-[34px] rounded-lg text-[11px] font-medium transition-colors ${
                        formScheduleType === 'weekly'
                          ? 'bg-zinc-800 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Weekly (Custom Days)
                    </button>
                  </div>
                </div>
              </div>

              {/* Time of Day */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Time of Day</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-[#090A0F] border border-white/10 rounded-xl">
                  {(
                    [
                      { id: 'am', label: 'Morning (AM)' },
                      { id: 'pm', label: 'Evening (PM)' },
                      { id: 'both', label: 'Both (AM & PM)' },
                    ] as const
                  ).map((tod) => (
                    <button
                      key={tod.id}
                      type="button"
                      onClick={() => setFormTimeOfDay(tod.id)}
                      className={`min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                        formTimeOfDay === tod.id
                          ? 'bg-zinc-800 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tod.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly Day Selector (Conditional when scheduleType is 'weekly') */}
              {formScheduleType === 'weekly' && (
                <div className="p-4 rounded-2xl bg-[#090A0F] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">Scheduled Weekdays</div>
                      <div className="text-[11px] text-zinc-400">
                        Select which days of the week this product should be used:
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-medium text-amber-300">
                      {formScheduledDays.length} day{formScheduledDays.length === 1 ? '' : 's'} selected
                    </span>
                  </div>

                  {/* 7 Days Button Row */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const isSelected = formScheduledDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleToggleWeekday(day.id)}
                          className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center p-1 border transition-all ${
                            isSelected
                              ? 'bg-white text-zinc-950 font-bold border-white shadow-sm'
                              : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-white/6 hover:border-white/15'
                          }`}
                        >
                          <span className="text-xs font-bold leading-tight">{day.shortLabel}</span>
                          <span
                            className={`text-[9px] uppercase tracking-wider ${
                              isSelected ? 'text-zinc-700' : 'text-zinc-500'
                            }`}
                          >
                            {day.id.slice(0, 3)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-zinc-500 font-medium mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setFormScheduledDays(['sunday', 'wednesday', 'friday'])}
                      className="min-h-[26px] px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-white/8 hover:border-white/20 text-[10px] text-zinc-300 hover:text-white transition-colors"
                    >
                      Sun, Wed, Fri (Wash Routine)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormScheduledDays(['tuesday', 'thursday', 'saturday'])}
                      className="min-h-[26px] px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-white/8 hover:border-white/20 text-[10px] text-zinc-300 hover:text-white transition-colors"
                    >
                      Tue, Thu, Sat
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormScheduledDays(['saturday', 'sunday'])}
                      className="min-h-[26px] px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-white/8 hover:border-white/20 text-[10px] text-zinc-300 hover:text-white transition-colors"
                    >
                      Weekends Only
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormScheduledDays([
                          'monday',
                          'tuesday',
                          'wednesday',
                          'thursday',
                          'friday',
                          'saturday',
                          'sunday',
                        ])
                      }
                      className="min-h-[26px] px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-white/8 hover:border-white/20 text-[10px] text-zinc-300 hover:text-white transition-colors"
                    >
                      All Days
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-500 italic">
                    * This weekly product will appear on the routine tracker checklist only on your selected days.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  maxLength={280}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Shade, texture, where ordered, or repurchase notes..."
                  className="w-full min-h-[42px] bg-[#090A0F] border border-white/10 rounded-xl px-3 text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                {editingProductId ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteProduct(editingProductId);
                      setIsProductModalOpen(false);
                      showToast('Product removed');
                    }}
                    className="min-h-[44px] px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-medium text-rose-400 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={productSaving}
                    className="min-h-[44px] px-5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold"
                  >
                    {productSaving ? 'Saving...' : editingProductId ? 'Save Changes' : 'Add Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
