export { createClient } from './client'
export { getEntityByUserId, getEntityBySlug, getEntityMenuSections, getEntityHomeWidgets, getEntityFaq } from './helpers'
export { isFollowing, followEntity, unfollowEntity } from './follows'
export { getPublicationsByEntity, getPublicationById, getPublicationByEntityAndSlug, createPublication, updatePublication, deletePublication } from './publications'
export { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from './notifications'
export { getCommentsByPublication, createComment, updateComment, deleteComment } from './comments'
export type { CommentWithAuthor } from './comments'
export { getAppointmentTypesByEntity, getAppointmentTypeById, getAppointmentTypeBySlug, createAppointmentType, updateAppointmentType, deleteAppointmentType } from './appointments'
export type { ServiceContentBlock } from './appointments'
export { listPublishedServiceReviews, getServiceReviewAggregates } from './service-reviews'
export type { ServiceReviewAggregates } from './service-reviews'
export { listUpcomingEvents, getEventBySlug, countEventRegistrations, createEvent, createEventRegistration, listEventRegistrations } from './events'
export type { EventRecord, EventContentBlock, EventFaqItem } from './events'
export { getAvailabilitySchedule, setAvailabilitySchedule, getAvailabilityExceptions, addAvailabilityException, removeAvailabilityException, getAvailableSlots } from './availability'
export { getBookingsByEntity, getBookingById, createBooking, updateBookingStatus, updateBookingNotes, getBookingStats, getBookingExtendedStats } from './bookings'
export type { BookingAggregates, BookingExtendedStats } from './bookings'
export { getClientsByEntity, getClientById, getClientBookings, updateClient, deleteClient } from './clients'
export type { Client } from './clients'
export { purgeEntityCache, purgePublicationCache } from './cache'
export type { Database } from './types'

// Products
export {
  getPublishedProductBySlug,
  listPublishedProductsByEntity,
  lookupProductSlugHistory,
  getProductById,
  listProductsByEntity,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductMedia,
  removeProductMedia,
  reorderProductMedia,
  listProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from './products'

export {
  listPublishedReviews,
  getReviewAggregates,
  getMyReview,
  createReview,
  updateMyReview,
  deleteMyReview,
  addReviewPhotos,
  removeReviewPhoto,
  listReviewsForModeration,
} from './product-reviews'
export type { ReviewAggregates } from './product-reviews'

export {
  listPublishedQuestions,
  askQuestion,
  deleteMyQuestion,
  answerQuestion,
  deleteMyAnswer,
  listQuestionsForModeration,
  listAnswersForModeration,
} from './product-qa'

export {
  listDiscountCodes,
  getDiscountCodeById,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  setDiscountCodeProducts,
  setDiscountCodeCategories,
  listDiscountCodeUses,
} from './discount-codes'

export {
  listProductCategories,
  getOrCreateProductCategory,
  deleteProductCategory,
} from './product-categories'

export {
  listEntityFiles,
  getEntityFileById,
  createEntityFile,
} from './entity-files'

export {
  getMyWishlist,
  isInWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  updateWishlistNote,
} from './wishlist'

export const IBEE_SYSTEM_SLUG = '__ibee__'

// Auth helpers (aussi accessibles via sub-path imports @ibee/supabase/auth/*)
export { createServerClient } from './auth/server'
export { createBrowserClient } from './auth/browser'
export { getSupabaseEnv } from './auth/env'
