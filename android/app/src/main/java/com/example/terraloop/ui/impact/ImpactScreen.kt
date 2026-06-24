package com.example.terraloop.ui.impact

import android.content.Context
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.*
import com.example.terraloop.data.*
import com.example.terraloop.theme.*

@Composable
fun ImpactScreen() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("tl_prefs", Context.MODE_PRIVATE) }
    val userId = remember { prefs.getString("user_id", "anonymous") ?: "anonymous" }

    var summary by remember { mutableStateOf<ImpactSummary?>(null) }
    var activity by remember { mutableStateOf<List<ActivityEvent>>(emptyList()) }
    var contributions by remember { mutableStateOf<List<Contribution>>(emptyList()) }
    var materialBars by remember { mutableStateOf<List<MaterialBar>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        try {
            val s = ApiClient.service.getImpactSummary(userId)
            val a = ApiClient.service.getActivity(userId)
            val c = ApiClient.service.getContributions(userId)
            val m = ApiClient.service.getMaterials(userId)
            summary = s
            activity = a.events
            contributions = c.contributions
            materialBars = m.bars
        } catch (e: Exception) {
            error = e.message ?: "Failed to load"
        } finally {
            loading = false
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(BgBase),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Text("My Impact", style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.Black,
                brush = Brush.horizontalGradient(listOf(Emerald, Cyan))
            ))
            Text("Your real-world environmental contribution",
                style = MaterialTheme.typography.bodySmall, color = TextMuted)
        }

        if (loading) {
            item {
                Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Emerald)
                }
            }
        } else if (error.isNotEmpty() && summary == null) {
            item {
                Text("⚠️ $error", style = MaterialTheme.typography.bodyMedium, color = Rose)
                Text("Is the backend running?", style = MaterialTheme.typography.labelSmall, color = TextMuted)
            }
        } else {
            // ── Hero Metrics ──
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(Brush.linearGradient(listOf(
                            Emerald.copy(alpha = 0.08f), Cyan.copy(alpha = 0.05f)
                        )))
                        .border(1.dp, Emerald.copy(alpha = 0.2f), RoundedCornerShape(18.dp))
                        .padding(20.dp)
                ) {
                    val s = summary ?: ImpactSummary()
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MetricCard("🌍", animatedCo2(s.co2Saved), "CO₂ Prevented", Modifier.weight(1f))
                        MetricCard("♻️", "${s.itemsDiverted}", "Items Diverted", Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MetricCard("🛠️", "${s.projectsMade}", "Projects Made", Modifier.weight(1f))
                        MetricCard("🔥", "${s.streak}", "Day Streak", Modifier.weight(1f))
                    }
                }
            }

            // ── Material Breakdown ──
            item {
                GlassSection("Materials Recycled") {
                    if (materialBars.isEmpty()) {
                        Text("No materials tracked yet.", style = MaterialTheme.typography.bodySmall, color = TextMuted)
                    } else {
                        val barColors = listOf(Emerald, Cyan, Purple, Amber, Rose)
                        materialBars.forEachIndexed { i, bar ->
                            MaterialBarRow(bar, barColors[i % barColors.size])
                            if (i < materialBars.size - 1) Spacer(Modifier.height(10.dp))
                        }
                    }
                }
            }

            // ── Contributions ──
            item {
                Text("Project Contributions", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                Text("Each project you post, and its real environmental impact",
                    style = MaterialTheme.typography.bodySmall, color = TextMuted)
                Spacer(Modifier.height(8.dp))
            }

            if (contributions.isEmpty()) {
                item {
                    Text("No projects posted yet. Share your first upcycle project!",
                        style = MaterialTheme.typography.bodySmall, color = TextMuted,
                        modifier = Modifier.padding(8.dp))
                }
            } else {
                items(contributions) { contrib -> ContributionCard(contrib) }
            }

            // ── Activity Log ──
            item {
                Spacer(Modifier.height(4.dp))
                Text("Activity Log", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                Spacer(Modifier.height(8.dp))
            }

            if (activity.isEmpty()) {
                item { Text("No activity yet.", style = MaterialTheme.typography.bodySmall, color = TextMuted) }
            } else {
                items(activity) { event -> ActivityRow(event) }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

// ── Sub-composables ──────────────────────────────────────────────────────

@Composable
fun animatedCo2(target: Double): String {
    var value by remember { mutableFloatStateOf(0f) }
    val animatedValue by animateFloatAsState(
        targetValue = target.toFloat(),
        animationSpec = tween(durationMillis = 1500, easing = FastOutSlowInEasing),
        label = "co2"
    )
    LaunchedEffect(target) { value = target.toFloat() }
    return "${String.format("%.1f", animatedValue)} kg"
}

@Composable
fun MetricCard(icon: String, value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0x08FFFFFF))
            .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(icon, fontSize = 28.sp)
        Text(value, style = MaterialTheme.typography.headlineSmall.copy(
            fontWeight = FontWeight.Black, color = Emerald
        ))
        Text(label, style = MaterialTheme.typography.labelSmall, color = TextMuted,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
fun MaterialBarRow(bar: MaterialBar, color: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(bar.label, style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold))
            Text(bar.count, style = MaterialTheme.typography.labelSmall, color = TextMuted)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color(0x10FFFFFF))
        ) {
            // Animate bar width
            val animatedWidth by animateFloatAsState(
                targetValue = bar.pct / 100f,
                animationSpec = tween(1200, easing = FastOutSlowInEasing),
                label = "bar"
            )
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(animatedWidth)
                    .clip(RoundedCornerShape(4.dp))
                    .background(color)
            )
        }
    }
}

@Composable
fun ContributionCard(contrib: Contribution) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0x0A000000))
            .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            modifier = Modifier.size(48.dp).clip(RoundedCornerShape(8.dp))
                .background(Emerald.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) { Text("🌱", fontSize = 24.sp) }

        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(contrib.title, style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                ChipTag("🌍 ${contrib.co2}")
                ChipTag("♻️ ${contrib.items}")
                ChipTag("📦 ${contrib.material}")
            }
            Text(contrib.date, style = MaterialTheme.typography.labelSmall, color = TextMuted)
        }
    }
}

@Composable
fun ActivityRow(event: ActivityEvent) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0x0A000000))
            .border(1.dp, GlassBorder, RoundedCornerShape(8.dp))
            .padding(10.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(event.icon, fontSize = 18.sp)
        Column(modifier = Modifier.weight(1f)) {
            Text(event.action, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium))
            if (event.time.isNotEmpty()) {
                Text(
                    try {
                        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
                        val date = sdf.parse(event.time.take(19))
                        java.text.SimpleDateFormat("d MMM, h:mm a", java.util.Locale.getDefault()).format(date!!)
                    } catch (_: Exception) { event.time },
                    style = MaterialTheme.typography.labelSmall, color = TextMuted
                )
            }
        }
        if (event.tag.isNotEmpty()) {
            Surface(shape = RoundedCornerShape(20.dp), color = Emerald.copy(alpha = 0.1f),
                border = BorderStroke(1.dp, Emerald.copy(alpha = 0.2f))) {
                Text(event.tag, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall, color = Emerald, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun ChipTag(text: String) {
    Surface(shape = RoundedCornerShape(20.dp), color = Emerald.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, Emerald.copy(alpha = 0.25f))) {
        Text(text, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            style = MaterialTheme.typography.labelSmall, color = Emerald, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun GlassSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0x0AFFFFFF))
            .border(1.dp, GlassBorder, RoundedCornerShape(18.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
        content()
    }
}
