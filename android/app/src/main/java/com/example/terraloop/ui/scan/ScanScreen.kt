package com.example.terraloop.ui.scan

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.example.terraloop.data.*
import com.example.terraloop.theme.*
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

// ── States ────────────────────────────────────────────────────────────────
private enum class ScanState { IDLE, SCANNING, RESULT, ERROR }

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ScanScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("tl_prefs", Context.MODE_PRIVATE) }
    val userId = remember { prefs.getString("user_id", "anonymous") ?: "anonymous" }

    var scanState by remember { mutableStateOf(ScanState.IDLE) }
    var scanResult by remember { mutableStateOf<ScanResult?>(null) }
    var errorMsg by remember { mutableStateOf("") }
    var descText by remember { mutableStateOf("") }

    // Pipeline steps
    var pipeStates by remember { mutableStateOf(listOf("idle", "idle", "idle")) }

    // Image picker
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            scope.launch {
                scanState = ScanState.SCANNING
                pipeStates = listOf("idle", "idle", "idle")
                try {
                    val bytes = context.contentResolver.openInputStream(it)?.readBytes() ?: return@launch
                    val reqBody = bytes.toRequestBody("image/*".toMediaType())
                    val part = MultipartBody.Part.createFormData("image", "scan.jpg", reqBody)
                    animatePipeline(pipeStates) { s -> pipeStates = s }
                    val result = ApiClient.service.scanImage(userId, part)
                    scanResult = result
                    pipeStates = listOf("done", "done", "done")
                    scanState = ScanState.RESULT
                } catch (e: Exception) {
                    errorMsg = e.message ?: "Scan failed. Is the backend running?"
                    scanState = ScanState.ERROR
                    pipeStates = listOf("idle", "idle", "idle")
                }
            }
        }
    }

    fun runTextScan(text: String) {
        if (text.isBlank()) return
        scope.launch {
            scanState = ScanState.SCANNING
            pipeStates = listOf("idle", "idle", "idle")
            try {
                animatePipeline(pipeStates) { s -> pipeStates = s }
                val result = ApiClient.service.scanText(userId, mapOf("description" to text))
                scanResult = result
                pipeStates = listOf("done", "done", "done")
                scanState = ScanState.RESULT
            } catch (e: Exception) {
                errorMsg = e.message ?: "Scan failed. Is the backend running?"
                scanState = ScanState.ERROR
                pipeStates = listOf("idle", "idle", "idle")
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgBase)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Text("AI Scanner", style = MaterialTheme.typography.headlineMedium.copy(
            fontWeight = FontWeight.Black,
            brush = Brush.horizontalGradient(listOf(Emerald, Cyan))
        ))
        Text("Point, snap, or describe — we figure out the rest",
            style = MaterialTheme.typography.bodySmall, color = TextMuted)

        // ── Scan Viewport ──
        GlassCard {
            // Camera / Upload Zone
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color(0x1A000000))
                    .border(1.dp, Brush.linearGradient(listOf(Color(0x3F10B981), Color(0x1406B6D4))), RoundedCornerShape(14.dp))
                    .clickable { if (scanState != ScanState.SCANNING) imagePicker.launch("image/*") },
                contentAlignment = Alignment.Center
            ) {
                AnimatedContent(targetState = scanState) { state ->
                    when (state) {
                        ScanState.IDLE -> IdleZone()
                        ScanState.SCANNING -> ScanningZone()
                        ScanState.RESULT -> ResultZone(scanResult)
                        ScanState.ERROR -> ErrorZone(errorMsg)
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // OR divider
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Divider(modifier = Modifier.weight(1f), color = GlassBorder)
                Text("OR", style = MaterialTheme.typography.labelSmall.copy(
                    color = TextMuted, fontWeight = FontWeight.Bold, letterSpacing = 2.sp))
                Divider(modifier = Modifier.weight(1f), color = GlassBorder)
            }

            Spacer(Modifier.height(4.dp))

            // Text describe
            Text("Describe your item instead",
                style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0x0AFFFFFF))
                    .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                BasicTextField(
                    value = descText,
                    onValueChange = { descText = it },
                    modifier = Modifier.weight(1f).padding(horizontal = 10.dp, vertical = 10.dp),
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = TextPrimary),
                    decorationBox = { inner ->
                        if (descText.isEmpty()) Text("e.g. empty 2L plastic bottle…",
                            style = MaterialTheme.typography.bodyMedium.copy(color = TextMuted))
                        inner()
                    },
                    singleLine = true
                )
                Button(
                    onClick = { runTextScan(descText) },
                    enabled = scanState != ScanState.SCANNING,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald, contentColor = BgVoid),
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                ) { Text("Go", fontWeight = FontWeight.Bold) }
            }
        }

        // ── Pipeline Status ──
        GlassCard {
            Text("Inference Pipeline", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            Spacer(Modifier.height(8.dp))
            val steps = listOf("CV Microservice" to "Edge", "Context Engine" to "DB", "Recommender" to "ML")
            steps.forEachIndexed { i, (name, badge) ->
                PipelineStep(name = name, badge = badge, state = pipeStates.getOrElse(i) { "idle" })
                if (i < steps.size - 1) {
                    Box(modifier = Modifier.padding(start = 5.dp).width(1.dp).height(16.dp).background(GlassBorder))
                }
            }
        }

        // ── Recommendations ──
        if (scanState == ScanState.RESULT && scanResult != null) {
            val result = scanResult!!
            if (result.recommendations != null) {
                Text("What you can do with it",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                result.recommendations!!.forEach { rec ->
                    RecommendationCard(rec)
                }
            } else {
                // Fallback — facility info
                result.facilityLookup?.let { FacilityCard(it, result) }
            }
        }
    }
}

// ── Sub-composables ────────────────────────────────────────────────────────

@Composable
fun IdleZone() {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(modifier = Modifier.size(80.dp).clip(RoundedCornerShape(50)).background(Color(0x1A10B981)),
            contentAlignment = Alignment.Center) { Text("📷", fontSize = 36.sp) }
        Text("Tap to scan an item", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
        Text("Upload a photo from your gallery", style = MaterialTheme.typography.bodySmall, color = TextMuted)
    }
}

@Composable
fun ScanningZone() {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        CircularProgressIndicator(color = Emerald, strokeWidth = 3.dp, modifier = Modifier.size(56.dp))
        Text("Analyzing material…", style = MaterialTheme.typography.bodyMedium, color = Emerald)
    }
}

@Composable
fun ResultZone(result: ScanResult?) {
    if (result == null) return
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(result.icon, fontSize = 44.sp)
            Column {
                Text(result.material, style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))
                Text(result.grade, style = MaterialTheme.typography.bodySmall, color = Emerald)
            }
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            result.tags.forEach { tag ->
                val color = when(tag.cls) {
                    "green" -> Emerald; "cyan" -> Cyan; "amber" -> Amber; "rose" -> Rose; "purple" -> Purple; else -> TextSecondary
                }
                Surface(shape = RoundedCornerShape(20.dp), color = color.copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, color.copy(alpha = 0.3f))) {
                    Text(tag.text, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall, color = color)
                }
            }
        }
    }
}

@Composable
fun ErrorZone(msg: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(16.dp)) {
        Text("⚠️", fontSize = 36.sp)
        Text("Scan failed", style = MaterialTheme.typography.titleSmall.copy(color = Rose, fontWeight = FontWeight.Bold))
        Text(msg, style = MaterialTheme.typography.bodySmall, color = TextMuted,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
fun PipelineStep(name: String, badge: String, state: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 6.dp)) {
        val dotColor = when(state) { "done" -> Emerald; "processing" -> Amber; else -> GlassBorder }
        Box(modifier = Modifier.size(12.dp).clip(RoundedCornerShape(6.dp)).background(dotColor))
        Column(modifier = Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold))
            Text(when(state) { "done" -> "✓ Complete"; "processing" -> "Processing…"; else -> "Awaiting input" },
                style = MaterialTheme.typography.labelSmall,
                color = when(state) { "done" -> Emerald; "processing" -> Amber; else -> TextMuted })
        }
        Surface(shape = RoundedCornerShape(20.dp), color = Color(0x0AFFFFFF)) {
            Text(badge, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                style = MaterialTheme.typography.labelSmall, color = TextMuted)
        }
    }
}

@Composable
fun RecommendationCard(rec: Recommendation) {
    val typeColor = when(rec.type) { "quick" -> Emerald; "creative" -> Purple; else -> Cyan }
    GlassCard(onClick = {}) {
        Surface(shape = RoundedCornerShape(20.dp), color = typeColor.copy(alpha = 0.12f),
            border = BorderStroke(1.dp, typeColor.copy(alpha = 0.25f))) {
            Text(rec.typeLabel, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                style = MaterialTheme.typography.labelSmall.copy(color = typeColor, fontWeight = FontWeight.Bold))
        }
        Spacer(Modifier.height(8.dp))
        Text(rec.title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
        Text(rec.desc, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            TagChip("⏱ ${rec.time}")
            if (rec.tools.isNotEmpty()) TagChip("🛠 ${rec.tools.joinToString()}")
            else TagChip("🤙 No tools")
            TagChip(if (rec.toolMatch) "✅ You have the tools" else "⚠️ Missing tools",
                color = if (rec.toolMatch) Emerald else Amber)
        }
        Spacer(Modifier.height(8.dp))
        LinearProgressIndicator(
            progress = { rec.effort / 100f },
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(2.dp)).height(4.dp),
            color = Emerald, trackColor = GlassBorder
        )
    }
}

@Composable
fun FacilityCard(lookup: FacilityLookup, result: ScanResult) {
    val found = lookup.found && lookup.facilities.isNotEmpty()
    val borderColor = if (found) Emerald else Amber
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(borderColor.copy(alpha = 0.07f))
            .border(1.dp, borderColor.copy(alpha = 0.2f), RoundedCornerShape(14.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(if (found) "✅ ${lookup.facilities.size} facility found near you" else "⚠️ No facility found nearby",
            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
        if (found) {
            lookup.facilities.forEach { facility ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0x0AFFFFFF))
                        .border(1.dp, GlassBorder, RoundedCornerShape(8.dp))
                        .padding(12.dp)) {
                    Text(facility.icon, fontSize = 20.sp)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(facility.name, style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold))
                        Text("${facility.hours} · ${facility.accepts}", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                    }
                    Text(facility.distance, style = MaterialTheme.typography.labelMedium.copy(color = Emerald, fontWeight = FontWeight.Bold))
                }
            }
        } else {
            Text("🔒 Store this item away from flammable materials. We've added it to your Digital Garage and will notify you when a facility becomes available.",
                style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        }
    }
}

@Composable
fun TagChip(text: String, color: Color = TextMuted) {
    Surface(shape = RoundedCornerShape(20.dp), color = Color(0x08FFFFFF),
        border = BorderStroke(1.dp, Color(0x10FFFFFF))) {
        Text(text, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            style = MaterialTheme.typography.labelSmall, color = color)
    }
}

@Composable
fun GlassCard(onClick: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(18.dp))
        .background(Color(0x0AFFFFFF))
        .border(1.dp, GlassBorder, RoundedCornerShape(18.dp))
        .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
        .padding(16.dp)
    Column(modifier = modifier, content = content)
}

// Pipeline animation helper
suspend fun animatePipeline(current: List<String>, onUpdate: (List<String>) -> Unit) {
    val states = current.toMutableList()
    for (i in states.indices) {
        states[i] = "processing"
        onUpdate(states.toList())
        kotlinx.coroutines.delay(600)
    }
}

@Composable
fun BasicTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    textStyle: androidx.compose.ui.text.TextStyle = androidx.compose.ui.text.TextStyle.Default,
    decorationBox: @Composable (innerTextField: @Composable () -> Unit) -> Unit = { it() },
    singleLine: Boolean = false
) {
    androidx.compose.foundation.text.BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        textStyle = textStyle,
        decorationBox = decorationBox,
        singleLine = singleLine
    )
}
