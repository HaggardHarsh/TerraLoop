package com.example.terraloop.ui.community

import android.content.Context
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import com.example.terraloop.data.*
import com.example.terraloop.theme.*

// Gradient backgrounds for posts without images
private val POST_GRADIENTS = listOf(
    listOf(Color(0xFF1A0A2E), Color(0xFF2D1B69)),
    listOf(Color(0xFF0A1628), Color(0xFF0C4A6E)),
    listOf(Color(0xFF022C22), Color(0xFF064E3B)),
    listOf(Color(0xFF1A0A00), Color(0xFF451A03)),
    listOf(Color(0xFF0A1628), Color(0xFF164E63)),
    listOf(Color(0xFF1A0A2E), Color(0xFF312E81)),
    listOf(Color(0xFF0C1A3A), Color(0xFF1E3A5F)),
)

private val TYPE_EMOJI = mapOf("creative" to "🎨", "functional" to "🔧", "quick" to "⚡")

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CommunityScreen() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("tl_prefs", Context.MODE_PRIVATE) }
    val userId = remember { prefs.getString("user_id", "anonymous") ?: "anonymous" }

    var posts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var stories by remember { mutableStateOf<List<Story>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var searchQuery by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    // Initial load
    LaunchedEffect(Unit) {
        try {
            val postsData = ApiClient.service.getPosts(userId)
            val storiesData = ApiClient.service.getStories(userId)
            posts = postsData.posts
            stories = storiesData.stories
        } catch (e: Exception) {
            error = e.message ?: "Failed to load"
        } finally {
            loading = false
        }
    }

    // Search
    LaunchedEffect(searchQuery) {
        if (searchQuery.isBlank()) return@LaunchedEffect
        kotlinx.coroutines.delay(400) // debounce
        try {
            val data = ApiClient.service.getPosts(userId, query = searchQuery)
            posts = data.posts
        } catch (_: Exception) { }
    }

    Column(modifier = Modifier.fillMaxSize().background(BgBase)) {
        // Search bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(Color(0x0DFFFFFF))
                .border(1.dp, GlassBorder, RoundedCornerShape(28.dp))
                .padding(horizontal = 16.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("🔍", fontSize = 16.sp)
            androidx.compose.foundation.text.BasicTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.weight(1f).padding(vertical = 10.dp),
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = TextPrimary),
                singleLine = true,
                decorationBox = { inner ->
                    if (searchQuery.isEmpty()) Text("Search upcycling projects, materials…",
                        style = MaterialTheme.typography.bodyMedium, color = TextMuted)
                    inner()
                }
            )
        }

        // Stories row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Add story
            StoryBubble(emoji = "+", name = "Your Story", isAdd = true)
            stories.forEach { story ->
                StoryBubble(
                    emoji = TYPE_EMOJI[story.type] ?: "🌱",
                    name = story.userId.take(6)
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Content
        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Emerald)
            }
        } else if (error.isNotEmpty() && posts.isEmpty()) {
            Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("⚠️ $error", style = MaterialTheme.typography.bodyMedium, color = Rose)
                Text("Is the backend running?", style = MaterialTheme.typography.labelSmall, color = TextMuted)
            }
        } else if (posts.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No posts yet. Be the first to share a project!",
                    style = MaterialTheme.typography.bodyMedium, color = TextSecondary, textAlign = TextAlign.Center)
            }
        } else {
            // Instagram-style explore grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 1.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                itemsIndexed(posts) { index, post ->
                    // Every 9th item = wide (2 cols), every 5th (of 9) = tall (2 rows)
                    val isWide = index % 9 == 0 && index > 0
                    ExploreGridItem(
                        post = post,
                        index = index,
                        isWide = isWide
                    )
                }
            }
        }
    }
}

@Composable
fun StoryBubble(emoji: String, name: String, isAdd: Boolean = false) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier.clickable { /* open story */ }
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(60.dp)
                .clip(CircleShape)
                .background(
                    if (isAdd) GlassBorder
                    else Brush.linearGradient(listOf(Emerald, Cyan))
                )
                .padding(2.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape)
                    .background(BgElevated)
            ) {
                Text(emoji, fontSize = 22.sp)
            }
        }
        Text(
            name, style = MaterialTheme.typography.labelSmall,
            color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis,
            modifier = Modifier.widthIn(max = 64.dp), textAlign = TextAlign.Center
        )
    }
}

@Composable
fun ExploreGridItem(post: Post, index: Int, isWide: Boolean = false) {
    val gradient = POST_GRADIENTS[index % POST_GRADIENTS.size]
    val emoji = TYPE_EMOJI[post.type] ?: "🌱"

    Box(
        modifier = Modifier
            .then(if (isWide) Modifier.fillMaxWidth() else Modifier)
            .aspectRatio(if (isWide) 2f else 1f)
            .background(Brush.linearGradient(gradient))
            .clickable { /* open post */ },
        contentAlignment = Alignment.Center
    ) {
        // Main content
        Text(emoji, fontSize = if (isWide) 56.sp else 40.sp)

        // Reel badge
        if (post.isReel) {
            Surface(
                modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
                shape = RoundedCornerShape(12.dp),
                color = Color(0x99000000)
            ) {
                Text("▶ Reel", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    style = MaterialTheme.typography.labelSmall, color = Color.White)
            }
        }

        // Bottom overlay
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xAA000000))))
                .padding(8.dp)
        ) {
            Column {
                Text(
                    post.title, style = MaterialTheme.typography.labelSmall.copy(
                        color = Color.White, fontWeight = FontWeight.Bold
                    ), maxLines = 1, overflow = TextOverflow.Ellipsis
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("❤️ ${post.likes}", style = MaterialTheme.typography.labelSmall, color = Color(0xB3FFFFFF))
                    if (post.time.isNotEmpty()) {
                        Text("⏱ ${post.time}", style = MaterialTheme.typography.labelSmall, color = Color(0xB3FFFFFF))
                    }
                }
            }
        }
    }
}
