export { createClient } from './client'
export { getEntityByUserId, getEntityBySlug, getEntityOwnedByUser, getEntityMenuSections, getEntityHomeWidgets, getEntityFaq } from './helpers'
export {
  MENU_SECTION_TYPES,
  PROFILE_TAB_TYPES,
  isMenuSectionType,
  listMenuSectionStates,
  activateEntityMenuSection,
  deactivateEntityMenuSection,
} from './menu-sections'
export type { MenuSectionType, ProfileTabType } from './menu-sections'
export {
  getEntityHistory,
  upsertEntityHistory,
  getEntityContactInfo,
  upsertEntityContactInfo,
  upsertEntityFaq,
  defaultOpeningHours,
} from './profile-info'
export type { OpeningHourSlot, EntityContactInfo, HistoryBlock, EntityFaqItemInput } from './profile-info'
export { createEntityMessage, listEntityMessages, createOwnerMessageReply, groupMessagesIntoThreads } from './entity-messages'
export type { EntityMessage, MessageThread } from './entity-messages'
export { isFollowing, followEntity, unfollowEntity, countFollowsInWindow } from './follows'
export { getPublicationsByEntity, getPublicationById, getPublicationByEntityAndSlug, createPublication, updatePublication, deletePublication } from './publications'
export { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from './notifications'
export { getActivityHub, getActivityHubSignals } from './activity-hub'
export type { ActivityHubSignal, ActivityHubSignals } from './activity-hub'
export { getCommentsByPublication, createComment, updateComment, deleteComment } from './comments'
export type { CommentWithAuthor } from './comments'
export { getAppointmentTypesByEntity, getAppointmentTypeById, getAppointmentTypeBySlug, createAppointmentType, updateAppointmentType, deleteAppointmentType } from './appointments'
export type { ServiceContentBlock } from './appointments'
export { listPublishedServiceReviews, getServiceReviewAggregates } from './service-reviews'
export type { ServiceReviewAggregates } from './service-reviews'
export { listUpcomingEvents, listUpcomingEventsForOwner, getEventBySlug, getEventById, deleteEvent, updateEventSettings, countEventRegistrations, createEvent, createEventRegistration, getConfirmedEventRegistrationByEmail, listEventRegistrations, listRegistrationsByEntity, cancelEventRegistration } from './events'
export {
  listTicketTypesByEvent,
  getTicketTypeById,
  createTicketType,
  updateTicketType,
  deleteTicketType,
  createEventTicketCheckout,
  completeEventTicketCheckout,
  expireStaleEventTicketCheckouts,
  countEventTicketHolds,
  getRegistrationByTicketCode,
  getRegistrationByOrderId,
  getRegistrationByOrderStripeSession,
  resolveEventTicketPriceCents,
  isEventTicketOnSale,
  generateEventTicketCode,
  listEntityEventPromoCodes,
  validateEventPromoCode,
  listRegistrationsDueForReminder,
  markRegistrationReminderSent,
  checkInEventRegistration,
  selfCheckInEventRegistration,
  getEventCheckInLiveStats,
  getEventEntreePublicStats,
  listEventsForCheckIn,
} from './event-tickets'
export type {
  EventTicketType,
  CreateEventTicketCheckoutInput,
  EventCheckInResult,
  EventCheckInLiveStats,
  EventEntreePublicStats,
  CheckInEventOption,
} from './event-tickets'
export type { EventRegistrationWithEvent } from './events'
export type { EventRecord, EventContentBlock, EventFaqItem } from './events'
export {
  listActivitiesByEvent,
  listActivitiesByEntity,
  getActivityById,
  createEventActivity,
  updateEventActivity,
  deleteEventActivity,
  countEventActivityHolds,
  isEventActivityPast,
} from './event-activities'
export type { EventActivity } from './event-activities'
export { getAvailabilitySchedule, setAvailabilitySchedule, getAvailabilityExceptions, addAvailabilityException, removeAvailabilityException, getAvailableSlots } from './availability'
export {
  getBookingsByEntity,
  getBookingById,
  createBooking,
  updateBookingStatus,
  updateBookingNotes,
  getBookingStats,
  getBookingExtendedStats,
  markBookingConfirmationSent,
  markBookingReminderSent,
  listBookingsDueForReminder,
} from './bookings'
export type { BookingAggregates, BookingExtendedStats, BookingWithType } from './bookings'
export {
  createBookingCheckout,
  attachStripeSessionToBooking,
  completeBookingCheckout,
  expireStaleBookingCheckouts,
  getBookingByStripeSessionId,
  resolveAppointmentUnitPriceCents,
  resolveAppointmentChargeCents,
  requiresBookingPayment,
  formatCancellationPolicyLabel,
  canCancelBookingByPolicy,
} from './booking-checkout'
export type { CreateBookingCheckoutInput } from './booking-checkout'
export { getClientsByEntity, getBannedClientsByEntity, getClientById, getClientBookings, updateClient, deleteClient, isEntityEmailBanned, banClientByEmail, unbanClient } from './clients'
export type { Client } from './clients'
export { purgeEntityCache, purgePublicationCache, getRevalidatePaths } from './cache'
export type { RevalidatePathsOptions } from './cache'
export {
  trackEvent,
  trackEvents,
  countEventsInWindow,
  countDistinctVisitorsInWindow,
  groupCountBySectionInWindow,
  groupCountByResourceInWindow,
  bucketEventsInWindow,
  bucketDistinctVisitorsInWindow,
  fetchAnalyseScopeRaw,
  fetchAnalyseRankingChartBuckets,
  listAnalyticsEvents,
  countDistinctVisitors,
  countEvents,
  groupCountByResource,
  groupCountBySection,
  computeDelta,
} from './analytics'
export type { AnalyticsEventRow, AnalyseScopeRpc, AnalyseBucketRow, AnalyseWebScopeRaw } from './analytics'
export {
  ensureDefaultTeamRoles,
  listTeamRoles,
  saveTeamRoles,
  isTeamRoleInUse,
  listTeamMembers,
  listTeamInvitations,
  createTeamInvitation,
  updateTeamMemberRole,
  removeTeamMember,
  touchTeamInvitation,
  teamEmailAlreadyUsed,
  getOwnerRole,
} from './team'
export type { TeamRoleRecord, TeamRoleSaveInput } from './team'
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
  sumEntityFilesBytes,
  listEntityFileIdsLinkedToProducts,
  isEntityFileLinkedToProduct,
  deleteEntityFileRecord,
  updateEntityFile,
} from './entity-files'

export {
  listEntityFolders,
  listAllEntityFolders,
  getEntityFolderById,
  createEntityFolder,
  updateEntityFolder,
  deleteEntityFolder,
  countEntityFolderChildren,
  sumUserDriveBytes,
} from './entity-folders'

export {
  getMyWishlist,
  isInWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  updateWishlistNote,
} from './wishlist'

export {
  createCheckoutOrder,
  attachStripeSessionToOrder,
  completeCheckoutOrder,
  getOrderById,
  getOrderByStripeSessionId,
  listOrdersByEntity,
  updateOrderFulfillment,
  getShopMetrics,
  isSaleActive,
  resolveUnitPriceCents,
  formatOrderRef,
} from './orders'
export type {
  OrderWithLines,
  ShopMetrics,
  CreateCheckoutOrderInput,
} from './orders'

export { insertOrderEvent, listOrderEventsByOrderIds } from './order-events'
export type { OrderEventRecord, InsertOrderEventInput } from './order-events'

export { getProjectRevenueSnapshot, getEventTicketMetrics } from './project-revenue'
export type { ProjectRevenueSnapshot, EventTicketMetrics, RevenueSource } from './project-revenue'

export {
  computeInitialNextRunAt,
  formatPayoutStartDateInput,
  defaultPayoutStartDateInput,
  parsePayoutStartDateInput,
  getEntityRevenueCentsInWindow,
  listPayoutRecipients,
  getPayoutSchedule,
  listPayoutTransfers,
  upsertPayoutSchedule,
  deletePayoutSchedule,
  listDuePayoutSchedules,
  runDuePayoutSchedules,
  markPayoutTransfersExported,
  markPayoutTransfersCompleted,
  getProjectAvailableBalanceCents,
  getCommittedTeamPayoutCents,
  getProjectPayoutSnapshot,
  createOneTimePayoutTransfers,
  buildPayoutTransfersCsv,
  formatPayoutTransferAmount,
  payoutTransferStatusLabel,
} from './project-payouts'
export type {
  PayoutRecurrence,
  PayoutAmountType,
  PayoutRecipientType,
  PayoutTransferStatus,
  PayoutRecipient,
  PayoutAllocationInput,
  PayoutAllocationRecord,
  PayoutScheduleRecord,
  PayoutTransferRecord,
  ProjectPayoutSnapshot,
} from './project-payouts'

export {
  createManualRegContactSession,
  getManualRegContactSessionByToken,
  getManualRegContactSessionById,
  consumeManualRegContactSession,
  getManualRegContactSessionPublic,
  submitManualRegContactSession,
} from './manual-reg-contact'
export type { ManualRegContactSession, ManualRegContactSessionPublic } from './manual-reg-contact'

export const IBEE_SYSTEM_SLUG = '__ibee__'

// Auth helpers (aussi accessibles via sub-path imports @ibee/supabase/auth/*)
export { createServerClient } from './auth/server'
export { createBrowserClient } from './auth/browser'
export { getSupabaseEnv } from './auth/env'

export { getUserProfile, upsertUserProfile } from './user-profiles'
export type { UserProfile } from './user-profiles'

export { listFavoritesByUser, addFavorite, removeFavorite } from './favorites'

export * from './project-talent'
