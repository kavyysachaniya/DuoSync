import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Droplets,
  Edit3,
  Package,
  Plus,
  Sparkles,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CareProductDoc,
  CareSegment,
  formatLocalDate,
  formatShortDate,
  getWeekdayFromDate,
  PartnerProfileView,
  ProductOwnerSlot,
  ProductStatus,
  RoutineCompletionDoc,
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
    icon: React.FC<{ className?: string }>;
    accentColor: string;
  }
> = {
  skincare: {
    title: 'Skincare',
    icon: Sparkles,
    accentColor: 'text-rose-400',
  },
  haircare: {
    title: 'Haircare',
    icon: Wind,
    accentColor: 'text-amber-400',
  },
  bodycare: {
    title: 'Bodycare',
    icon: Droplets,
    accentColor: 'text-sky-400',
  },
};

const STATUS_CONFIG: Record<ProductStatus, { label: string; dotColor: string; bg: string }> = {
  in_use: { label: 'In Use', dotColor: 'bg-emerald-400', bg: 'bg-emerald-500/10 text-emerald-300' },
  unopened: { label: 'Backup', dotColor: 'bg-amber-400', bg: 'bg-amber-500/10 text-amber-300' },
  finished: { label: 'Finished', dotColor: 'bg-zinc-500', bg: 'bg-zinc-500/10 text-zinc-400' },
};

const DAYS_OF_WEEK: { id: WeekDay; letter: string; index: number }[] = [
  { id: 'sunday', letter: 'S', index: 0 },
  { id: 'monday', letter: 'M', index: 1 },
  { id: 'tuesday', letter: 'T', index: 2 },
  { id: 'wednesday', letter: 'W', index: 3 },
  { id: 'thursday', letter: 'T', index: 4 },
  { id: 'friday', letter: 'F', index: 5 },
  { id: 'saturday', letter: 'S', index: 6 },
];

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
  // 1. Top segment toggle
  const [activeSegment, setActiveSegment] = useState<CareSegment>('skincare');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');

  // Detail Modal State (on tap card)
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<CareProductDoc | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add / Edit Product Modal State
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
  const [formScheduleType, setFormScheduleType] = useState<'daily' | 'weekly'>('daily');
  const [formScheduledDays, setFormScheduledDays] = useState<WeekDay[]>(['wednesday', 'sunday']);
  const [formTimeOfDay, setFormTimeOfDay] = useState<'am' | 'pm' | 'both'>('both');
  const [formNotes, setFormNotes] = useState('');
  const [productSaving, setProductSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  const todayWeekday = useMemo(() => getWeekdayFromDate(todayDate), [todayDate]);

  // Compute dates for current week (Sunday to Saturday) relative to todayDate
  const currentWeekDates = useMemo(() => {
    const [y, m, d] = todayDate.split('-').map(Number);
    const todayObj = new Date(y, m - 1, d);
    const todayIndex = todayObj.getDay(); // 0 = Sunday

    const map: Record<WeekDay, { dateStr: string; dayIndex: number; isPast: boolean; isToday: boolean; isFuture: boolean }> = {} as any;

    DAYS_OF_WEEK.forEach((item) => {
      const diff = item.index - todayIndex;
      const targetDate = new Date(todayObj);
      targetDate.setDate(todayObj.getDate() + diff);
      const dateStr = formatLocalDate(targetDate);
      map[item.id] = {
        dateStr,
        dayIndex: item.index,
        isPast: item.index < todayIndex,
        isToday: item.index === todayIndex,
        isFuture: item.index > todayIndex,
      };
    });

    return map;
  }, [todayDate]);

  // Filter products for active segment & active profile boundary
  const segmentProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.segment !== activeSegment) return false;
      // Strictly enforce personal boundary: only show active profile's products or shared essentials
      if (p.profileSlot !== profile.slot && p.profileSlot !== 'shared') return false;
      return true;
    });
  }, [products, activeSegment, profile.slot]);

  // Products filtered by selected subcategory chip
  const filteredGridProducts = useMemo(() => {
    if (selectedSubCategory === 'all') return segmentProducts;
    return segmentProducts.filter((p) => p.subCategory === selectedSubCategory);
  }, [segmentProducts, selectedSubCategory]);

  // 2. Today's Weekly Routine Checklist
  const todayScheduledProducts = useMemo(() => {
    return segmentProducts.filter((p) => {
      if (p.status !== 'in_use') return false;
      const isWeekly =
        p.scheduleType === 'weekly' || (p.routineTime === 'weekly' && p.scheduleType !== 'daily');
      if (!isWeekly) return false;
      const days = p.scheduledDays && p.scheduledDays.length > 0 ? p.scheduledDays : [];
      return days.includes(todayWeekday);
    });
  }, [segmentProducts, todayWeekday]);

  // Sort checklist: pending items first, completed items moved to the end
  const sortedChecklist = useMemo(() => {
    return [...todayScheduledProducts].sort((a, b) => {
      const aDone = Boolean(routineCompletionsMap[`${profile.slot}_${a.id}_${todayDate}`]?.completed);
      const bDone = Boolean(routineCompletionsMap[`${profile.slot}_${b.id}_${todayDate}`]?.completed);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }, [todayScheduledProducts, routineCompletionsMap, profile.slot, todayDate]);

  const checklistDoneCount = useMemo(() => {
    return todayScheduledProducts.filter(
      (p) => Boolean(routineCompletionsMap[`${profile.slot}_${p.id}_${todayDate}`]?.completed)
    ).length;
  }, [todayScheduledProducts, routineCompletionsMap, profile.slot, todayDate]);

  // Helper to calculate weekly calendar day status for a product
  const getDayStatus = (day: { id: WeekDay; letter: string; index: number }, product: CareProductDoc) => {
    const isScheduled = (product.scheduledDays || []).includes(day.id);
    if (!isScheduled) {
      return { isScheduled: false, status: 'unscheduled' as const, isToday: false };
    }

    const info = currentWeekDates[day.id];
    if (!info) {
      return { isScheduled: true, status: 'upcoming' as const, isToday: false };
    }

    const isApplied = Boolean(
      routineCompletionsMap[`${profile.slot}_${product.id}_${info.dateStr}`]?.completed
    );

    let status: 'applied' | 'missed' | 'upcoming';
    if (isApplied) {
      status = 'applied'; // Green
    } else if (info.isPast) {
      status = 'missed'; // Red (past day, not applied)
    } else {
      status = 'upcoming'; // Yellow (today unapplied, or upcoming scheduled day)
    }

    return { isScheduled: true, status, isToday: info.isToday, dateStr: info.dateStr, isApplied };
  };

  // Open modal to add product
  const handleOpenAddProduct = (catOverride?: string) => {
    const segCats = categoriesBySegment[activeSegment] || ['Cleanser'];
    const defaultCat =
      catOverride && catOverride !== 'all' ? catOverride : segCats[0] || 'Cleanser';

    setEditingProductId(undefined);
    setFormSegment(activeSegment);
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

  // Open modal to edit existing product
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
      // If detail modal is open for this product, update it
      if (selectedProductForDetail && selectedProductForDetail.id === editingProductId) {
        setSelectedProductForDetail((prev) =>
          prev
            ? {
                ...prev,
                name: formName.trim(),
                brand: formBrand.trim(),
                subCategory: cleanSubCat,
                pricePaid: Math.round(paid * 100) / 100,
                originalPrice: Math.round(orig * 100) / 100,
                status: formStatus,
                scheduleType: formScheduleType,
                scheduledDays: formScheduleType === 'weekly' ? formScheduledDays : [],
                routineTime: formScheduleType === 'weekly' ? 'weekly' : formTimeOfDay,
                quantity: qty,
                notes: formNotes.trim(),
              }
            : null
        );
      }
      showToast(editingProductId ? 'Product updated' : 'Product added');
    } finally {
      setProductSaving(false);
    }
  };

  const handleToggleWeekday = (day: WeekDay) => {
    setFormScheduledDays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const getOwnerLabel = (slot: ProductOwnerSlot) => {
    if (slot === 'shared') return 'Shared';
    if (slot === profile.slot) return profile.name;
    return partnerProfile.name;
  };

  return (
    <div className="space-y-4 pb-32 sm:pb-16 min-w-0">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-18 right-4 z-50 bg-white text-zinc-950 font-semibold px-4 py-2 rounded-2xl shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP SEGMENT TOGGLE (Skincare / Haircare / Bodycare) + Add Product "+" Button */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex-1 flex items-center p-1 rounded-full bg-[#12141C] border border-white/10 shadow-lg">
          {(['skincare', 'haircare', 'bodycare'] as CareSegment[]).map((seg) => {
            const meta = SEGMENT_META[seg];
            const Icon = meta.icon;
            const isActive = activeSegment === seg;
            return (
              <button
                key={seg}
                type="button"
                onClick={() => {
                  setActiveSegment(seg);
                  setSelectedSubCategory('all');
                }}
                className={`relative flex-1 min-h-[40px] px-2 sm:px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isActive ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="skinSegmentPill"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="absolute inset-0 rounded-full bg-white shadow-md"
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10 shrink-0" />
                <span className="relative z-10">{meta.title}</span>
              </button>
            );
          })}
        </div>

        {/* Small "+" Add Product Button */}
        <button
          type="button"
          onClick={() => handleOpenAddProduct()}
          className="w-11 h-11 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0"
          title={`Add ${SEGMENT_META[activeSegment].title} Product`}
          aria-label={`Add ${SEGMENT_META[activeSegment].title} Product`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* 2. REMINDER / CHECKLIST STRIP */}
      {todayScheduledProducts.length === 0 ? (
        /* Collapsed slim row (about 40px) when nothing scheduled */
        <div className="min-h-[40px] px-4 py-2 rounded-2xl bg-[#12141C] border border-white/8 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-zinc-300">Today’s Care Routine</span>
          </div>
          <span className="text-zinc-500 font-mono text-[11px]">No routine today ✓</span>
        </div>
      ) : (
        /* Compact horizontal checklist with done counter */
        <div className="rounded-2xl bg-[#12141C] border border-white/8 p-3 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Today’s Routine Checklist</span>
            </div>
            <span className="text-xs font-mono font-bold text-rose-300 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30">
              {checklistDoneCount}/{todayScheduledProducts.length} done
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {sortedChecklist.map((prod) => {
              const isDone = Boolean(
                routineCompletionsMap[`${profile.slot}_${prod.id}_${todayDate}`]?.completed
              );
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => onToggleRoutineCompletion(prod.id, todayDate, !isDone)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-medium whitespace-nowrap transition-all active:scale-95 shrink-0 ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through opacity-75'
                      : 'bg-[#090A0F] border-white/10 text-white hover:border-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-zinc-500 bg-transparent'
                    }`}
                  >
                    {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate max-w-[130px]">{prod.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">({prod.subCategory})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. PRODUCT GRID (2×2) WITH CATEGORY FILTER CHIPS */}
      <div className="space-y-3">
        {/* Horizontally scrollable thin row of category filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setSelectedSubCategory('all')}
            className={`min-h-[32px] px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              selectedSubCategory === 'all'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-[#12141C] text-zinc-400 hover:text-white border border-white/8'
            }`}
          >
            All ({segmentProducts.length})
          </button>
          {activeCategories.map((cat) => {
            const count = segmentProducts.filter((p) => p.subCategory === cat).length;
            const isSelected = selectedSubCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedSubCategory(cat)}
                className={`min-h-[32px] px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-[#12141C] text-zinc-400 hover:text-white border border-white/8'
                }`}
              >
                {cat} {count > 0 && <span className="opacity-70 text-[10px] ml-0.5">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* 2×2 Product Grid */}
        {filteredGridProducts.length === 0 ? (
          <div className="rounded-3xl bg-[#12141C] border border-white/8 p-8 text-center space-y-3">
            <Package className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No products found</h3>
              <p className="text-xs text-zinc-400">
                {selectedSubCategory === 'all'
                  ? `No ${SEGMENT_META[activeSegment].title} items added yet.`
                  : `No products in "${selectedSubCategory}".`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddProduct(selectedSubCategory)}
              className="min-h-[40px] px-5 rounded-xl bg-white text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Product</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredGridProducts.map((product) => {
              const isDaily =
                product.scheduleType === 'daily' ||
                (product.routineTime !== 'weekly' && product.scheduleType !== 'weekly');

              const statusMeta = STATUS_CONFIG[product.status] || STATUS_CONFIG.in_use;

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProductForDetail(product)}
                  className="rounded-2xl bg-[#12141C] border border-white/10 hover:border-white/20 p-3 flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-md active:scale-[0.98] group"
                >
                  <div className="space-y-2.5">
                    {/* 1:1 Aspect Ratio Photo or Neutral Placeholder Icon */}
                    <div className="aspect-square w-full rounded-xl bg-zinc-950 border border-white/6 overflow-hidden relative flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.thumbnailUrl || product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/40">
                          <Package className="w-7 h-7 text-zinc-600" />
                        </div>
                      )}

                      {/* Status Dot Pill at top-right */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm border border-white/10">
                        <span className={`w-2 h-2 rounded-full ${statusMeta.dotColor} shrink-0`} />
                        <span className="text-[9px] font-semibold text-zinc-300">
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>

                    {/* Brand & Name */}
                    <div className="space-y-0.5">
                      <div className="text-[10px] text-zinc-400 font-mono truncate uppercase tracking-wider">
                        {product.brand || 'Care Essential'}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                    </div>

                    {/* Category Tag */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/6 text-zinc-300 font-medium">
                        {product.subCategory}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Schedule Indicator */}
                  <div className="pt-2.5 mt-2 border-t border-white/6">
                    {isDaily ? (
                      /* Daily Product: Tag only, NO calendar */
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          {product.routineTime === 'both'
                            ? 'AM & PM'
                            : product.routineTime === 'am'
                            ? 'AM Routine'
                            : product.routineTime === 'pm'
                            ? 'PM Routine'
                            : 'Daily'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">Daily</span>
                      </div>
                    ) : (
                      /* Weekly Non-Daily Product: Mini Calendar Strip (S M T W T F S) */
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          {DAYS_OF_WEEK.map((day) => {
                            const res = getDayStatus(day, product);
                            if (!res.isScheduled) {
                              return (
                                <div
                                  key={day.id}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono text-zinc-700 select-none"
                                >
                                  {day.letter}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={day.id}
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono transition-transform select-none ${
                                  res.status === 'applied'
                                    ? 'bg-emerald-500 text-white font-bold'
                                    : res.status === 'missed'
                                    ? 'bg-rose-500 text-white font-bold'
                                    : 'bg-amber-400 text-zinc-950 font-bold'
                                } ${res.isToday ? 'ring-1.5 ring-white shadow-sm' : ''}`}
                                title={`${day.id}: ${res.status}`}
                              >
                                {day.letter}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. CARD DETAIL MODAL (ON TAP) */}
      <AnimatePresence>
        {selectedProductForDetail && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product Details"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="w-full max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 text-zinc-100 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                    {selectedProductForDetail.brand || 'Care Essential'}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-xs sm:max-w-md">
                    {selectedProductForDetail.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductForDetail(null)}
                  className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
                  aria-label="Close Product Details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-5 space-y-4 no-scrollbar">
                {/* Large 1:1 Aspect Ratio Photo */}
                <div className="aspect-square w-full rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden relative flex items-center justify-center">
                  {selectedProductForDetail.imageUrl ? (
                    <img
                      src={selectedProductForDetail.thumbnailUrl || selectedProductForDetail.imageUrl}
                      alt={selectedProductForDetail.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/50">
                      <Package className="w-14 h-14 text-zinc-600 mb-2" />
                      <span className="text-xs text-zinc-500 font-mono">No photo uploaded</span>
                    </div>
                  )}

                  {/* Status & Owner Pill Overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 text-xs font-semibold text-white">
                      {getOwnerLabel(selectedProductForDetail.profileSlot)}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 text-xs font-semibold text-zinc-200">
                      {selectedProductForDetail.subCategory}
                    </span>
                  </div>
                </div>

                {/* Routine Application Calendar & "Mark applied" Button */}
                <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Routine Usage</span>
                    <span className="text-xs font-mono text-zinc-400">
                      {selectedProductForDetail.scheduleType === 'weekly' ||
                      selectedProductForDetail.routineTime === 'weekly'
                        ? 'Weekly Schedule'
                        : 'Daily Routine'}
                    </span>
                  </div>

                  {/* Calendar Strip if weekly */}
                  {selectedProductForDetail.scheduleType === 'weekly' ||
                  selectedProductForDetail.routineTime === 'weekly' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-7 gap-1.5 pt-1">
                        {DAYS_OF_WEEK.map((day) => {
                          const res = getDayStatus(day, selectedProductForDetail);
                          if (!res.isScheduled) {
                            return (
                              <div
                                key={day.id}
                                className="h-8 rounded-xl bg-zinc-900/40 text-zinc-700 flex flex-col items-center justify-center text-[10px] font-mono"
                              >
                                {day.letter}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={day.id}
                              className={`h-8 rounded-xl flex flex-col items-center justify-center text-[10px] font-mono transition-transform ${
                                res.status === 'applied'
                                  ? 'bg-emerald-500 text-white font-bold'
                                  : res.status === 'missed'
                                  ? 'bg-rose-500 text-white font-bold'
                                  : 'bg-amber-400 text-zinc-950 font-bold'
                              } ${res.isToday ? 'ring-2 ring-white shadow-md' : ''}`}
                            >
                              <span>{day.letter}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Applied
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Missed
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Upcoming
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Scheduled for daily use ({selectedProductForDetail.routineTime.toUpperCase()}).
                    </p>
                  )}

                  {/* Mark Applied for Today Button */}
                  {(() => {
                    const isTodayDone = Boolean(
                      routineCompletionsMap[`${profile.slot}_${selectedProductForDetail.id}_${todayDate}`]
                        ?.completed
                    );
                    return (
                      <button
                        type="button"
                        onClick={async () => {
                          await onToggleRoutineCompletion(
                            selectedProductForDetail.id,
                            todayDate,
                            !isTodayDone
                          );
                        }}
                        className={`w-full min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                          isTodayDone
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-md shadow-white/5'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>{isTodayDone ? 'Applied Today ✓' : 'Mark Applied for Today'}</span>
                      </button>
                    );
                  })()}
                </div>

                {/* Financials & Savings Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-3 space-y-1">
                    <span className="text-[10px] text-zinc-400 font-mono block">Price Paid</span>
                    <span className="text-base font-bold text-white font-mono block">
                      {currency}{selectedProductForDetail.pricePaid || 0}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-3 space-y-1">
                    <span className="text-[10px] text-zinc-400 font-mono block">MRP / Orig</span>
                    <span className="text-base font-bold text-zinc-400 font-mono block">
                      {currency}{selectedProductForDetail.originalPrice || 0}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-3 space-y-1">
                    <span className="text-[10px] text-zinc-400 font-mono block">Discount</span>
                    <span className="text-base font-bold text-emerald-400 font-mono block">
                      {selectedProductForDetail.originalPrice > selectedProductForDetail.pricePaid
                        ? `${Math.round(
                            ((selectedProductForDetail.originalPrice - selectedProductForDetail.pricePaid) /
                              selectedProductForDetail.originalPrice) *
                              100
                          )}%`
                        : '0%'}
                    </span>
                  </div>
                </div>

                {/* Key Dates & Quantity */}
                <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Status</span>
                    <span className="font-semibold text-white capitalize">
                      {selectedProductForDetail.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Quantity / Backups</span>
                    <span className="font-mono text-white font-semibold">
                      {selectedProductForDetail.quantity || 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Purchase Date</span>
                    <span className="font-mono text-zinc-300">
                      {formatShortDate(selectedProductForDetail.orderedDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Opened Date</span>
                    <span className="font-mono text-zinc-300">
                      {formatShortDate(selectedProductForDetail.openedDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Expiry Date</span>
                    <span className="font-mono text-zinc-300">
                      {formatShortDate(selectedProductForDetail.expiryDate)}
                    </span>
                  </div>
                  {selectedProductForDetail.saleInfo && (
                    <div className="pt-2 border-t border-white/6 flex items-start justify-between gap-3">
                      <span className="text-zinc-400 shrink-0">Sale / Offer</span>
                      <span className="text-rose-300 text-right">{selectedProductForDetail.saleInfo}</span>
                    </div>
                  )}
                  {selectedProductForDetail.notes && (
                    <div className="pt-2 border-t border-white/6 space-y-1">
                      <span className="text-zinc-400 block">Notes</span>
                      <p className="text-zinc-300 italic">{selectedProductForDetail.notes}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Edit and Delete */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const prod = selectedProductForDetail;
                      setSelectedProductForDetail(null);
                      handleOpenEditProduct(prod);
                    }}
                    className="min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors active:scale-95"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Product</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (confirmDeleteId !== selectedProductForDetail.id) {
                        setConfirmDeleteId(selectedProductForDetail.id);
                        return;
                      }
                      await onDeleteProduct(selectedProductForDetail.id);
                      setSelectedProductForDetail(null);
                      setConfirmDeleteId(null);
                      showToast('Product deleted');
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors active:scale-95 ${
                      confirmDeleteId === selectedProductForDetail.id
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {confirmDeleteId === selectedProductForDetail.id ? 'Confirm Delete' : 'Delete'}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. ADD / EDIT PRODUCT MODAL FORM */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add or Edit Product"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 text-zinc-100 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingProductId ? 'Edit Routine Product' : 'Add Routine Product'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Configure details, usage schedule, pricing & inventory
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
                  aria-label="Close Product Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveProductSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-5 space-y-4 no-scrollbar">
                  {/* Care Segment Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Care Segment</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#090A0F] border border-white/10 rounded-2xl">
                      {(['skincare', 'haircare', 'bodycare'] as CareSegment[]).map((seg) => (
                        <button
                          key={seg}
                          type="button"
                          onClick={() => {
                            setFormSegment(seg);
                            const cats = categoriesBySegment[seg] || ['Cleanser'];
                            if (!cats.includes(formSubCategory)) {
                              setFormSubCategory(cats[0] || 'Cleanser');
                            }
                          }}
                          className={`min-h-[40px] rounded-xl text-xs font-semibold capitalize transition-colors ${
                            formSegment === seg
                              ? 'bg-white text-zinc-950 font-bold shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {seg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Product Name & Brand */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Brand Name *</label>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        placeholder="e.g. CeraVe, The Ordinary..."
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Product Name *</label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        placeholder="e.g. Daily Facial Cleanser..."
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* SubCategory Selection */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">Category Tag</label>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                      {(categoriesBySegment[formSegment] || []).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormSubCategory(cat)}
                          className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                            formSubCategory === cat
                              ? 'bg-rose-500 text-white shadow-md'
                              : 'bg-[#090A0F] text-zinc-400 border border-white/6 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Schedule Type (Daily vs Weekly) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">Usage Schedule</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormScheduleType('daily')}
                        className={`min-h-[44px] rounded-2xl text-xs font-semibold transition-all ${
                          formScheduleType === 'daily'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                            : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                        }`}
                      >
                        Daily Use
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormScheduleType('weekly')}
                        className={`min-h-[44px] rounded-2xl text-xs font-semibold transition-all ${
                          formScheduleType === 'weekly'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                            : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                        }`}
                      >
                        Weekly Scheduled Days
                      </button>
                    </div>

                    {/* If Weekly: Weekday Picker */}
                    {formScheduleType === 'weekly' && (
                      <div className="p-3 rounded-2xl bg-[#090A0F] border border-white/8 space-y-2">
                        <span className="text-[11px] text-zinc-400 block font-medium">
                          Select days to apply this product:
                        </span>
                        <div className="grid grid-cols-7 gap-1">
                          {WEEKDAY_OPTIONS.map((opt) => {
                            const isSelected = formScheduledDays.includes(opt.id);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleToggleWeekday(opt.id)}
                                className={`h-9 rounded-xl text-xs font-mono font-bold transition-all ${
                                  isSelected
                                    ? 'bg-rose-500 text-white shadow-md'
                                    : 'bg-zinc-900 text-zinc-500 hover:text-white border border-white/6'
                                }`}
                              >
                                {opt.shortLabel[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Slot Owner */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">Who uses this product?</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormProfileSlot(profile.slot)}
                        className={`min-h-[40px] rounded-xl text-xs font-semibold transition-colors ${
                          formProfileSlot === profile.slot
                            ? 'bg-sky-500 text-white'
                            : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                        }`}
                      >
                        {profile.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormProfileSlot(partnerProfile.slot)}
                        className={`min-h-[40px] rounded-xl text-xs font-semibold transition-colors ${
                          formProfileSlot === partnerProfile.slot
                            ? 'bg-rose-500 text-white'
                            : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                        }`}
                      >
                        {partnerProfile.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormProfileSlot('shared')}
                        className={`min-h-[40px] rounded-xl text-xs font-semibold transition-colors ${
                          formProfileSlot === 'shared'
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                        }`}
                      >
                        Shared
                      </button>
                    </div>
                  </div>

                  {/* Pricing & Quantity */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Price Paid ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formPricePaid}
                        onChange={(e) => setFormPricePaid(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-3 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">MRP / Orig ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formOriginalPrice}
                        onChange={(e) => setFormOriginalPrice(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-3 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={formQuantity}
                        onChange={(e) => setFormQuantity(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-3 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {/* Dates (Ordered, Opened, Expiry) */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-zinc-300">Purchased</label>
                      <input
                        type="date"
                        value={formOrderedDate}
                        onChange={(e) => setFormOrderedDate(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-2 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-zinc-300">Opened</label>
                      <input
                        type="date"
                        value={formOpenedDate}
                        onChange={(e) => setFormOpenedDate(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-2 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-zinc-300">Expiry</label>
                      <input
                        type="date"
                        value={formExpiryDate}
                        onChange={(e) => setFormExpiryDate(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-2 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">Inventory Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['in_use', 'unopened', 'finished'] as ProductStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setFormStatus(st)}
                          className={`min-h-[40px] rounded-xl text-xs font-semibold capitalize transition-colors ${
                            formStatus === st
                              ? 'bg-white text-zinc-950 font-bold shadow-sm'
                              : 'bg-[#090A0F] text-zinc-400 border border-white/6'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes & Sale Info */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Sale Deal / Offer Details</label>
                      <input
                        type="text"
                        placeholder="e.g. Buy 1 Get 1 Free, Nykaa Pink Friday 30% Off..."
                        value={formSaleInfo}
                        onChange={(e) => setFormSaleInfo(e.target.value)}
                        className="w-full min-h-[44px] bg-[#090A0F] border border-white/10 rounded-2xl px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Personal Notes / Tips</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Patch test first, apply on damp skin..."
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        className="w-full p-3 bg-[#090A0F] border border-white/10 rounded-2xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="shrink-0 p-4 border-t border-white/10 bg-[#12141C] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={productSaving}
                    className="min-h-[44px] px-6 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {productSaving ? 'Saving...' : editingProductId ? 'Save Changes' : 'Add Product'}
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
