package com.example.terraloop.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ── Scan ────────────────────────────────────────────────────────────────────

@Serializable
data class MaterialTag(
    val text: String,
    val cls: String
)

@Serializable
data class Recommendation(
    val type: String,
    val typeLabel: String,
    val title: String,
    val time: String,
    val effort: Int,
    val tools: List<String> = emptyList(),
    val desc: String,
    val score: Int = 100,
    val toolMatch: Boolean = true
)

@Serializable
data class FacilityItem(
    val name: String,
    val icon: String,
    val distance: String,
    val hours: String,
    val accepts: String,
    val phone: String? = null
)

@Serializable
data class FacilityLookup(
    val found: Boolean,
    val facilities: List<FacilityItem> = emptyList()
)

@Serializable
data class ScanResult(
    val icon: String = "📦",
    val material: String,
    val grade: String,
    val co2SavedPerItem: Double = 0.0,
    val fallback: Boolean = false,
    val fallbackType: String? = null,
    val tags: List<MaterialTag> = emptyList(),
    val recommendations: List<Recommendation>? = null,
    val facilityLookup: FacilityLookup? = null
)

// ── User Profile ────────────────────────────────────────────────────────────

@Serializable
data class UserProfile(
    val userId: String,
    val housing: String = "apartment",
    val pincode: String = "",
    val greenSpace: String = "none",
    val bins: Int = 2,
    val compostAvailable: Boolean = false,
    val pickupDays: List<String> = emptyList(),
    val tools: List<String> = emptyList(),
    val demographic: String = "adult",
    val fcmToken: String? = null
)

// ── Garage ──────────────────────────────────────────────────────────────────

@Serializable
data class GarageItem(
    val id: String = "",
    val icon: String = "📦",
    val name: String,
    val material: String = "",
    val grade: String = "",
    val tags: List<String> = emptyList(),
    val instructions: String = "",
    val fallbackType: String = "ewaste",
    val status: String = "pending",
    val statusLabel: String = "Awaiting Disposal",
    val createdAt: String = ""
)

@Serializable
data class GarageResponse(
    val items: List<GarageItem>,
    val count: Int
)

// ── Community ───────────────────────────────────────────────────────────────

@Serializable
data class Post(
    val id: String = "",
    val userId: String = "",
    val title: String,
    val type: String = "creative",
    val time: String = "",
    val tools: List<String> = emptyList(),
    val sourceMaterial: String = "",
    val description: String = "",
    val co2Saved: Double = 0.0,
    val imageUrl: String? = null,
    val likes: Int = 0,
    val saves: Int = 0,
    val isReel: Boolean = false,
    val createdAt: String = ""
)

@Serializable
data class PostsResponse(
    val posts: List<Post>,
    val total: Int = 0
)

@Serializable
data class Story(
    val userId: String,
    val title: String,
    val type: String
)

@Serializable
data class StoriesResponse(
    val stories: List<Story>
)

// ── Impact ──────────────────────────────────────────────────────────────────

@Serializable
data class ImpactSummary(
    val co2Saved: Double = 0.0,
    val itemsDiverted: Int = 0,
    val projectsMade: Int = 0,
    val streak: Int = 0
)

@Serializable
data class ActivityEvent(
    val id: String = "",
    val icon: String = "🔍",
    val action: String,
    val time: String = "",
    val tag: String = ""
)

@Serializable
data class ActivityResponse(val events: List<ActivityEvent>)

@Serializable
data class Contribution(
    val id: String = "",
    val title: String,
    val co2: String,
    val items: String,
    val material: String,
    val date: String
)

@Serializable
data class ContributionsResponse(val contributions: List<Contribution>)

@Serializable
data class MaterialBar(
    val label: String,
    val count: String,
    val pct: Int
)

@Serializable
data class MaterialsResponse(val bars: List<MaterialBar>)

// ── Notifications ───────────────────────────────────────────────────────────

@Serializable
data class Notification(
    val id: String = "",
    val dot: String = "green",
    val message: String,
    val type: String = "info",
    val read: Boolean = false,
    val createdAt: String = ""
)

@Serializable
data class NotificationsResponse(val notifications: List<Notification>)
