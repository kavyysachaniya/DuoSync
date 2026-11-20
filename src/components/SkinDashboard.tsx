import React, { useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Edit3,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/apiClient';
import { cropImageToSquare } from '../utils/imageCropper';
import {
  getCategoryIcon,
  ProductPhotoSilhouette,
  CameraUploadIcon,
  PhotoUploadIcon,
} from './SkinIcons';
import {
  ScreenHeader,
  ChipBar,
  TodayRow,
  ItemCard,
  EmptyState,
} from './shared';
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
  }
> = {
  skincare: {
    title: 'Skincare',
  },
  haircare: {
    title: 'Haircare',
  },
  bodycare: {
    title: 'Bodycare',
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
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [isUploadingFormImage, setIsUploadingFormImage] = useState(false);
  const [uploadingCardProductId, setUploadingCardProductId] = useState<string | null>(null);
  const [isUploadingDetailImage, setIsUploadingDetailImage] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Hidden file input references for 1:1 auto-crop photo uploads
  const cardFileInputRef = useRef<HTMLInputElement | null>(null);
  const detailFileInputRef = useRef<HTMLInputElement | null>(null);
  const formFileInputRef = useRef<HTMLInputElement | null>(null);
  const targetUploadProductIdRef = useRef<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2000);
  };

  /**
   * Reads an image file, automatically center-crops it into a 1:1 square on an HTML5 canvas,
   * attempts to upload to object storage backend, with local cropped dataUrl fallback.
   */
  const processAndUploadFile = async (
    file: File,
    workspaceId?: string
  ): Promise<{ imageUrl: string; thumbnailUrl: string }> => {
    // 1. Center-crop automatically to 1:1 aspect ratio square using HTML5 canvas
    const { dataUrl, filename } = await cropImageToSquare(file, 800, 0.88);

    // 2. Attempt cloud upload to backend storage
    try {
      const wsId = workspaceId || products[0]?.workspaceId || 'shared';
      const uploadRes = await api.upload.uploadImage(dataUrl, filename, wsId);
      if (uploadRes?.imageUrl) {
        return {
          imageUrl: uploadRes.imageUrl,
          thumbnailUrl: uploadRes.thumbnailUrl || uploadRes.imageUrl,
        };
      }
    } catch (err) {
      console.warn('Backend storage upload fallback to local 1:1 cropped data URL:', err);
    }

    // 3. Fallback to 1:1 cropped base64 data URL
    return { imageUrl: dataUrl, thumbnailUrl: dataUrl };
  };

  // 1:1 Photo Upload directly from Product Card in 2x2 grid
  const handleTriggerCardUpload = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    targetUploadProductIdRef.current = productId;
    if (cardFileInputRef.current) {
      cardFileInputRef.current.value = '';
      cardFileInputRef.current.click();
    }
  };

  const handleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const prodId = targetUploadProductIdRef.current;
    if (!file || !prodId) return;

    const targetProduct = products.find((p) => p.id === prodId);
    if (!targetProduct) return;

    try {
      setUploadingCardProductId(prodId);
      const { imageUrl, thumbnailUrl } = await processAndUploadFile(file, targetProduct.workspaceId);

      await onSaveProduct(
        {
          profileSlot: targetProduct.profileSlot,
          segment: targetProduct.segment,
          subCategory: targetProduct.subCategory,
          name: targetProduct.name,
          brand: targetProduct.brand,
          quantity: targetProduct.quantity,
          orderedDate: targetProduct.orderedDate,
          openedDate: targetProduct.openedDate,
          expiryDate: targetProduct.expiryDate,
          saleInfo: targetProduct.saleInfo,
          pricePaid: targetProduct.pricePaid,
          originalPrice: targetProduct.originalPrice,
          status: targetProduct.status,
          scheduleType: targetProduct.scheduleType,
          scheduledDays: targetProduct.scheduledDays,
          routineTime: targetProduct.routineTime,
          notes: targetProduct.notes,
          imageUrl,
          thumbnailUrl,
        },
        targetProduct.id
      );

      if (selectedProductForDetail && selectedProductForDetail.id === prodId) {
        setSelectedProductForDetail((prev) => (prev ? { ...prev, imageUrl, thumbnailUrl } : null));
      }

      showToast('1:1 Product photo updated!');
    } catch (err: any) {
      console.error('Card photo upload error:', err);
      showToast(err?.message || 'Failed to process photo');
    } finally {
      setUploadingCardProductId(null);
      targetUploadProductIdRef.current = null;
    }
  };

  // 1:1 Photo Upload & Remove from Detail Modal
  const handleDetailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProductForDetail) return;

    try {
      setIsUploadingDetailImage(true);
      const { imageUrl, thumbnailUrl } = await processAndUploadFile(
        file,
        selectedProductForDetail.workspaceId
      );

      await onSaveProduct(
        {
          profileSlot: selectedProductForDetail.profileSlot,
          segment: selectedProductForDetail.segment,
          subCategory: selectedProductForDetail.subCategory,
          name: selectedProductForDetail.name,
          brand: selectedProductForDetail.brand,
          quantity: selectedProductForDetail.quantity,
          orderedDate: selectedProductForDetail.orderedDate,
          openedDate: selectedProductForDetail.openedDate,
          expiryDate: selectedProductForDetail.expiryDate,
          saleInfo: selectedProductForDetail.saleInfo,
          pricePaid: selectedProductForDetail.pricePaid,
          originalPrice: selectedProductForDetail.originalPrice,
          status: selectedProductForDetail.status,
          scheduleType: selectedProductForDetail.scheduleType,
          scheduledDays: selectedProductForDetail.scheduledDays,
          routineTime: selectedProductForDetail.routineTime,
          notes: selectedProductForDetail.notes,
          imageUrl,
          thumbnailUrl,
        },
        selectedProductForDetail.id
      );

      setSelectedProductForDetail((prev) => (prev ? { ...prev, imageUrl, thumbnailUrl } : null));
      showToast('1:1 Product photo updated!');
    } catch (err: any) {
      console.error('Detail photo upload error:', err);
      showToast(err?.message || 'Failed to update photo');
    } finally {
      setIsUploadingDetailImage(false);
    }
  };

  const handleDetailRemovePhoto = async () => {
    if (!selectedProductForDetail) return;
    try {
      setIsUploadingDetailImage(true);
      await onSaveProduct(
        {
          profileSlot: selectedProductForDetail.profileSlot,
          segment: selectedProductForDetail.segment,
          subCategory: selectedProductForDetail.subCategory,
          name: selectedProductForDetail.name,
          brand: selectedProductForDetail.brand,
          quantity: selectedProductForDetail.quantity,
          orderedDate: selectedProductForDetail.orderedDate,
          openedDate: selectedProductForDetail.openedDate,
          expiryDate: selectedProductForDetail.expiryDate,
          saleInfo: selectedProductForDetail.saleInfo,
          pricePaid: selectedProductForDetail.pricePaid,
          originalPrice: selectedProductForDetail.originalPrice,
          status: selectedProductForDetail.status,
          scheduleType: selectedProductForDetail.scheduleType,
          scheduledDays: selectedProductForDetail.scheduledDays,
          routineTime: selectedProductForDetail.routineTime,
          notes: selectedProductForDetail.notes,
          imageUrl: '',
          thumbnailUrl: '',
        },
        selectedProductForDetail.id
      );

      setSelectedProductForDetail((prev) => (prev ? { ...prev, imageUrl: '', thumbnailUrl: '' } : null));
      showToast('Photo removed');
    } catch (err: any) {
      console.error('Remove photo error:', err);
      showToast('Failed to remove photo');
    } finally {
      setIsUploadingDetailImage(false);
    }
  };

  // 1:1 Photo Upload from Add / Edit Product Modal
  const handleFormFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFormImage(true);
      // Auto crop to 1:1 square
      const { dataUrl, filename } = await cropImageToSquare(file, 800, 0.88);
      // Instant local preview
      setFormImageUrl(dataUrl);
      setFormThumbnailUrl(dataUrl);

      // Cloud storage upload in background
      try {
        const wsId = products[0]?.workspaceId || 'shared';
        const uploadRes = await api.upload.uploadImage(dataUrl, filename, wsId);
        if (uploadRes?.imageUrl) {
          setFormImageUrl(uploadRes.imageUrl);
          setFormThumbnailUrl(uploadRes.thumbnailUrl || uploadRes.imageUrl);
          showToast('1:1 Photo cropped & uploaded!');
        }
      } catch (uploadErr) {
        console.warn('Backend upload fallback:', uploadErr);
        showToast('1:1 Photo cropped locally!');
      }
    } catch (err: any) {
      console.error('Form photo error:', err);
      showToast(err?.message || 'Failed to process image');
    } finally {
      setIsUploadingFormImage(false);
    }
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
    setFormImageUrl('');
    setFormThumbnailUrl('');
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
    setFormImageUrl(prod.imageUrl || '');
    setFormThumbnailUrl(prod.thumbnailUrl || prod.imageUrl || '');
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
          imageUrl: formImageUrl.trim(),
          thumbnailUrl: formThumbnailUrl.trim() || formImageUrl.trim(),
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
                imageUrl: formImageUrl.trim(),
                thumbnailUrl: formThumbnailUrl.trim() || formImageUrl.trim(),
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
      {/* Hidden file inputs for 1:1 auto-crop photo uploads */}
      <input
        ref={cardFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCardFileChange}
      />
      <input
        ref={detailFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleDetailFileChange}
      />
      <input
        ref={formFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFormFileChange}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-18 right-4 z-50 bg-white text-zinc-950 font-semibold px-4 py-2 rounded-2xl shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. PERSONAL HEADER */}
      <ScreenHeader
        eyebrow="PERSONAL CARE STUDIO"
        title={`${profile.name}’s Personal Care Routine`}
        subtitle="Your skincare, haircare and bodycare, in one shelf."
      />

      {/* 2. SEGMENTED CONTROL (Skincare / Haircare / Bodycare) + Round White "+" Button */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex-1 flex items-center p-1 rounded-full bg-[#0A0A0F] border border-white/10 shadow-lg">
          {(['skincare', 'haircare', 'bodycare'] as CareSegment[]).map((seg) => {
            const meta = SEGMENT_META[seg];
            const isActive = activeSegment === seg;
            return (
              <button
                key={seg}
                type="button"
                onClick={() => {
                  setActiveSegment(seg);
                  setSelectedSubCategory('all');
                }}
                className={`relative flex-1 min-h-[40px] px-2 sm:px-4 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
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
                <span className="relative z-10">{meta.title}</span>
              </button>
            );
          })}
        </div>

        {/* Round White "+" Add Product Button */}
        <button
          type="button"
          onClick={() => handleOpenAddProduct()}
          className="w-11 h-11 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0 cursor-pointer"
          title={`Add ${SEGMENT_META[activeSegment].title} Product`}
          aria-label={`Add ${SEGMENT_META[activeSegment].title} Product`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* 3. TODAY'S CARE ROUTINE ROW (1px hairline above and below, no box, no fill) */}
      <TodayRow
        title="Today’s Care Routine"
        statusText={
          todayScheduledProducts.length === 0
            ? 'No routine today'
            : `${checklistDoneCount}/${todayScheduledProducts.length} completed`
        }
      >
        {todayScheduledProducts.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {sortedChecklist.map((prod) => {
              const isDone = Boolean(
                routineCompletionsMap[`${profile.slot}_${prod.id}_${todayDate}`]?.completed
              );
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => onToggleRoutineCompletion(prod.id, todayDate, !isDone)}
                  className={`min-h-[34px] px-3.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through opacity-75'
                      : 'bg-white/[0.04] border-white/10 text-white hover:border-white/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-white/40'}`} />
                  <span>{prod.name}</span>
                  <span className="text-[10px] text-white/40 font-mono">({prod.subCategory})</span>
                </button>
              );
            })}
          </div>
        )}
      </TodayRow>

      {/* 4. CATEGORY CHIP BAR (Single row, ghost inactive, rose active, no icons) */}
      <ChipBar
        categories={[
          { id: 'all', label: 'All', count: segmentProducts.length },
          ...activeCategories.map((cat) => ({
            id: cat,
            label: cat,
            count: segmentProducts.filter((p) => p.subCategory === cat).length,
          })),
        ]}
        selectedCategory={selectedSubCategory}
        onSelectCategory={setSelectedSubCategory}
      />

      {/* 5. 2-COLUMN PRODUCT GRID OR TEXT-ONLY EMPTY STATE */}
      {filteredGridProducts.length === 0 ? (
        <EmptyState
          title="No products yet"
          subtitle={
            selectedSubCategory === 'all'
              ? `Add your first ${SEGMENT_META[activeSegment].title.toLowerCase()} product to start your care routine.`
              : `No products in "${selectedSubCategory}". Add your first product to this shelf.`
          }
          actionLabel="+ Add Product"
          onAction={() => handleOpenAddProduct(selectedSubCategory)}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredGridProducts.map((product, idx) => (
            <ItemCard
              key={product.id}
              id={product.id}
              name={product.name}
              brand={product.brand}
              category={product.subCategory}
              imageUrl={product.imageUrl}
              thumbnailUrl={product.thumbnailUrl}
              index={idx}
              onClick={() => setSelectedProductForDetail(product)}
            />
          ))}
        </div>
      )}

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
              className="w-full max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#0A0A0F] border border-white/10 text-zinc-100 shadow-2xl overflow-hidden"
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
                      <ProductPhotoSilhouette className="w-16 h-16 text-zinc-600 mb-2" />
                      <span className="text-xs text-zinc-500 font-mono">No photo uploaded</span>
                    </div>
                  )}

                  {/* Status & Owner Pill Overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 text-xs font-semibold text-white">
                      {getOwnerLabel(selectedProductForDetail.profileSlot)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 text-xs font-semibold text-zinc-200">
                      {(() => {
                        const CatIcon = getCategoryIcon(
                          selectedProductForDetail.subCategory,
                          selectedProductForDetail.segment
                        );
                        return <CatIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
                      })()}
                      <span>{selectedProductForDetail.subCategory}</span>
                    </span>
                  </div>

                  {/* 1:1 Photo Actions on Detail Modal */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={() => detailFileInputRef.current?.click()}
                      disabled={isUploadingDetailImage}
                      className="px-3.5 py-2 rounded-xl bg-black/85 hover:bg-black/95 active:scale-95 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg"
                    >
                      {isUploadingDetailImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          <span className="text-[11px] font-mono">Cropping 1:1...</span>
                        </>
                      ) : (
                        <>
                          <CameraUploadIcon className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-[11px]">
                            {selectedProductForDetail.imageUrl ? 'Change Photo' : 'Upload 1:1 Photo'}
                          </span>
                        </>
                      )}
                    </button>

                    {selectedProductForDetail.imageUrl && !isUploadingDetailImage && (
                      <button
                        type="button"
                        onClick={handleDetailRemovePhoto}
                        className="w-9 h-9 rounded-xl bg-black/85 hover:bg-rose-950/80 active:scale-95 backdrop-blur-md border border-white/20 hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-all shadow-lg"
                        title="Remove Photo"
                        aria-label="Remove Photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Processing Overlay during Detail 1:1 Upload */}
                  {isUploadingDetailImage && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                      <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
                      <span className="text-xs font-mono font-semibold text-white">
                        Cropping & uploading 1:1 photo...
                      </span>
                    </div>
                  )}
                </div>

                {/* Routine Application Calendar & "Mark applied" Button */}
                <div className="rounded-2xl bg-black border border-white/8 p-4 space-y-3">
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
                  <div className="rounded-2xl bg-black border border-white/8 p-3 space-y-1">
                    <span className="text-[10px] text-zinc-400 font-mono block">Price Paid</span>
                    <span className="text-base font-bold text-white font-mono block">
                      {currency}{selectedProductForDetail.pricePaid || 0}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-black border border-white/8 p-3 space-y-1">
                    <span className="text-[10px] text-zinc-400 font-mono block">MRP / Orig</span>
                    <span className="text-base font-bold text-zinc-400 font-mono block">
                      {currency}{selectedProductForDetail.originalPrice || 0}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-black border border-white/8 p-3 space-y-1">
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
                <div className="rounded-2xl bg-black border border-white/8 p-4 space-y-2.5 text-xs">
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
              className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#0A0A0F] border border-white/10 text-zinc-100 shadow-2xl overflow-hidden"
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
                  {/* Dedicated 1:1 Product Photo Upload & Preview Card */}
                  <div className="p-3.5 rounded-2xl bg-black border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <PhotoUploadIcon className="w-4 h-4 text-rose-400" />
                        <span>Product Photo (1:1 Square)</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Auto-crops to 1:1
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* 1:1 Preview Box */}
                      <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-white/15 overflow-hidden relative shrink-0 flex items-center justify-center shadow-inner">
                        {formImageUrl ? (
                          <img
                            src={formThumbnailUrl || formImageUrl}
                            alt="Product Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ProductPhotoSilhouette className="w-10 h-10 text-zinc-600" />
                        )}
                        {isUploadingFormImage && (
                          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1">
                            <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                            <span className="text-[8px] font-mono text-zinc-300">Cropping...</span>
                          </div>
                        )}
                      </div>

                      {/* Upload & URL Controls */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => formFileInputRef.current?.click()}
                            disabled={isUploadingFormImage}
                            className="min-h-[38px] px-3.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 active:scale-95 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                          >
                            <CameraUploadIcon className="w-3.5 h-3.5" />
                            <span>{formImageUrl ? 'Change Photo' : 'Upload Photo (1:1)'}</span>
                          </button>

                          {formImageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormImageUrl('');
                                setFormThumbnailUrl('');
                              }}
                              className="min-h-[38px] px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 active:scale-95 text-xs font-medium transition-all"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Or paste image URL (https://...)"
                          value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                          onChange={(e) => {
                            setFormImageUrl(e.target.value);
                            setFormThumbnailUrl(e.target.value);
                          }}
                          className="w-full min-h-[34px] bg-black border border-white/10 rounded-xl px-3 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-rose-400 transition-colors font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Care Segment Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Care Segment</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-black border border-white/10 rounded-2xl">
                      {(['skincare', 'haircare', 'bodycare'] as CareSegment[]).map((seg) => {
                        const isSelected = formSegment === seg;
                        return (
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
                            className={`min-h-[40px] rounded-xl text-xs font-semibold capitalize flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span>{seg}</span>
                          </button>
                        );
                      })}
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
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400 transition-colors"
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
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* SubCategory Selection */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">Category Tag</label>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                      {(categoriesBySegment[formSegment] || []).map((cat) => {
                        const CatIcon = getCategoryIcon(cat, formSegment);
                        const isSelected = formSubCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFormSubCategory(cat)}
                            className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-rose-500 text-white shadow-md'
                                : 'bg-black text-zinc-400 border border-white/6 hover:text-white'
                            }`}
                          >
                            <CatIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{cat}</span>
                          </button>
                        );
                      })}
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
                            : 'bg-black text-zinc-400 border border-white/6'
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
                            : 'bg-black text-zinc-400 border border-white/6'
                        }`}
                      >
                        Weekly Scheduled Days
                      </button>
                    </div>

                    {/* If Weekly: Weekday Picker */}
                    {formScheduleType === 'weekly' && (
                      <div className="p-3 rounded-2xl bg-black border border-white/8 space-y-2">
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
                            : 'bg-black text-zinc-400 border border-white/6'
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
                            : 'bg-black text-zinc-400 border border-white/6'
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
                            : 'bg-black text-zinc-400 border border-white/6'
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
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-3 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
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
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-3 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
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
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-3 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
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
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-2 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-zinc-300">Opened</label>
                      <input
                        type="date"
                        value={formOpenedDate}
                        onChange={(e) => setFormOpenedDate(e.target.value)}
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-2 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-zinc-300">Expiry</label>
                      <input
                        type="date"
                        value={formExpiryDate}
                        onChange={(e) => setFormExpiryDate(e.target.value)}
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-2 text-xs font-mono text-white focus:outline-none focus:border-rose-400"
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
                              : 'bg-black text-zinc-400 border border-white/6'
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
                        className="w-full min-h-[44px] bg-black border border-white/10 rounded-2xl px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Personal Notes / Tips</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Patch test first, apply on damp skin..."
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        className="w-full p-3 bg-black border border-white/10 rounded-2xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="shrink-0 p-4 border-t border-white/10 bg-[#0A0A0F] flex items-center justify-end gap-2">
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
