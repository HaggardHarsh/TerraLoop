package com.example.terraloop.ui.garage

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.example.terraloop.data.*
import com.example.terraloop.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun GarageScreen() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("tl_prefs", Context.MODE_PRIVATE) }
    val userId = remember { prefs.getString("user_id", "anonymous") ?: "anonymous" }

    var garageItems by remember { mutableStateOf<List<GarageItem>>(emptyList()) }
    var notifications by remember { mutableStateOf<List<Notification>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        try {
            val garage = ApiClient.service.getGarage(userId)
            val notifs = ApiClient.service.getNotifications(userId)
            garageItems = garage.items
            notifications = notifs.notifications
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
        item {
            Text("Digital Garage", style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.Black,
                brush = androidx.compose.ui.graphics.Brush.horizontalGradient(listOf(Emerald, Cyan))
            ))
            Text("Items awaiting safe disposal — we'll notify you when a facility is nearby",
                style = MaterialTheme.typography.bodySmall, color = TextMuted)
            Spacer(Modifier.height(8.dp))
        }

        // Stats row
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard("⏳", garageItems.size.toString(), "Awaiting", Modifier.weight(1f))
                StatCard("✅", "12", "Resolved", Modifier.weight(1f))
                StatCard("🔔", notifications.size.toString(), "Alerts", Modifier.weight(1f))
            }
        }

        if (loading) {
            item { CircularProgressIndicator(color = Emerald, modifier = Modifier.padding(24.dp)) }
        } else if (error.isNotEmpty()) {
            item {
                Text("⚠️ $error", style = MaterialTheme.typography.bodySmall, color = Rose,
                    modifier = Modifier.padding(8.dp))
                Text("Is the backend running? (node server.js in terraloop-backend/)",
                    style = MaterialTheme.typography.labelSmall, color = TextMuted)
            }
        } else if (garageItems.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                    Text("✅ Your garage is empty — no hazardous items pending.",
                        style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                }
            }
        } else {
            items(garageItems) { item -> GarageItemCard(item) }
        }

        // Notifications
        item {
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("🔔", fontSize = 18.sp)
                Text("Notifications", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Emerald))
                Text("Live", style = MaterialTheme.typography.labelSmall, color = Emerald)
            }
        }

        if (notifications.isEmpty()) {
            item { Text("No notifications yet.", style = MaterialTheme.typography.bodySmall, color = TextMuted) }
        } else {
            items(notifications) { notif -> NotificationItem(notif) }
        }
    }
}

@Composable
fun StatCard(icon: String, value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x0AFFFFFF))
            .border(1.dp, GlassBorder, RoundedCornerShape(14.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(icon, fontSize = 24.sp)
        Text(value, style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black, color = Emerald))
        Text(label, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
    }
}

@Composable
fun GarageItemCard(item: GarageItem) {
    val statusColor = when(item.status) { "alert" -> Rose; else -> Amber }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x0AFFFFFF))
            .border(1.dp, GlassBorder, RoundedCornerShape(14.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(item.icon, fontSize = 28.sp)
            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold))
                Text(
                    if (item.createdAt.isNotEmpty()) formatDate(item.createdAt) else "Recently added",
                    style = MaterialTheme.typography.labelSmall, color = TextMuted
                )
            }
            Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f),
                border = BorderStroke(1.dp, statusColor.copy(alpha = 0.3f))) {
                Text(item.statusLabel, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall, color = statusColor, fontWeight = FontWeight.Bold)
            }
        }
        Text(item.instructions, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        if (item.tags.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                item.tags.take(3).forEach { tag ->
                    Surface(shape = RoundedCornerShape(20.dp), color = Color(0x08FFFFFF),
                        border = BorderStroke(1.dp, GlassBorder)) {
                        Text(tag, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            style = MaterialTheme.typography.labelSmall, color = TextMuted)
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationItem(notif: Notification) {
    val dotColor = when(notif.dot) { "green" -> Emerald; "amber" -> Amber; else -> Cyan }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(Color(0x0AFFFFFF))
            .border(1.dp, GlassBorder, RoundedCornerShape(10.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(dotColor).padding(top = 4.dp))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(notif.message, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium))
            if (notif.createdAt.isNotEmpty()) {
                Text(formatDate(notif.createdAt), style = MaterialTheme.typography.labelSmall, color = TextMuted)
            }
        }
    }
}

private fun formatDate(iso: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = sdf.parse(iso.take(19)) ?: return iso
        SimpleDateFormat("d MMM, h:mm a", Locale.getDefault()).format(date)
    } catch (e: Exception) { iso }
}
