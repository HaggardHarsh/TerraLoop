package com.example.terraloop.data

import android.content.Context
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

// ── API Base URL ──────────────────────────────────────────────────────────
// Change to your machine's IP when testing on a physical device
// e.g. "http://192.168.1.100:3000/api/"
const val API_BASE_URL = "http://10.0.2.2:3000/api/" // 10.0.2.2 = localhost from Android emulator

// ── Retrofit Interface ────────────────────────────────────────────────────

interface TerraLoopApiService {

    // Scan
    @POST("scan")
    suspend fun scanText(
        @Header("x-user-id") userId: String,
        @Body body: Map<String, String>
    ): ScanResult

    @Multipart
    @POST("scan")
    suspend fun scanImage(
        @Header("x-user-id") userId: String,
        @Part image: MultipartBody.Part
    ): ScanResult

    // User
    @POST("user/profile")
    suspend fun saveProfile(
        @Header("x-user-id") userId: String,
        @Body profile: UserProfile
    ): Map<String, String>

    @GET("user/{id}")
    suspend fun getProfile(
        @Header("x-user-id") userId: String,
        @Path("id") id: String
    ): UserProfile

    // Garage
    @GET("garage")
    suspend fun getGarage(
        @Header("x-user-id") userId: String
    ): GarageResponse

    @POST("garage")
    suspend fun addGarageItem(
        @Header("x-user-id") userId: String,
        @Body item: GarageItem
    ): Map<String, String>

    // Posts
    @GET("posts")
    suspend fun getPosts(
        @Header("x-user-id") userId: String,
        @Query("q") query: String? = null,
        @Query("limit") limit: Int = 30
    ): PostsResponse

    @GET("posts/stories")
    suspend fun getStories(
        @Header("x-user-id") userId: String
    ): StoriesResponse

    @POST("posts/{id}/like")
    suspend fun likePost(
        @Header("x-user-id") userId: String,
        @Path("id") postId: String
    ): Map<String, String>

    // Facilities
    @GET("facilities")
    suspend fun getFacilities(
        @Header("x-user-id") userId: String,
        @Query("pincode") pincode: String,
        @Query("type") type: String
    ): FacilityLookup

    // Impact
    @GET("impact/summary")
    suspend fun getImpactSummary(
        @Header("x-user-id") userId: String
    ): ImpactSummary

    @GET("impact/activity")
    suspend fun getActivity(
        @Header("x-user-id") userId: String
    ): ActivityResponse

    @GET("impact/contributions")
    suspend fun getContributions(
        @Header("x-user-id") userId: String
    ): ContributionsResponse

    @GET("impact/materials")
    suspend fun getMaterials(
        @Header("x-user-id") userId: String
    ): MaterialsResponse

    // Notifications
    @GET("notifications")
    suspend fun getNotifications(
        @Header("x-user-id") userId: String
    ): NotificationsResponse
}

// ── Retrofit Singleton ────────────────────────────────────────────────────

object ApiClient {
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val service: TerraLoopApiService by lazy {
        Retrofit.Builder()
            .baseUrl(API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json; charset=UTF-8".toMediaType()))
            .build()
            .create(TerraLoopApiService::class.java)
    }
}
