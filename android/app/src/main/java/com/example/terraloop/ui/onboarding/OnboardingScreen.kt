package com.example.terraloop.ui.onboarding

import android.content.Context
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.*
import com.example.terraloop.data.*
import com.example.terraloop.theme.*
import kotlinx.coroutines.launch
import java.util.UUID

@Composable
fun OnboardingScreen(onComplete: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var step by remember { mutableIntStateOf(0) }

    // Profile state
    var housing by remember { mutableStateOf("apartment") }
    var greenSpace by remember { mutableStateOf("none") }
    var bins by remember { mutableIntStateOf(2) }
    var compost by remember { mutableStateOf(true) }
    var pickupDays by remember { mutableStateOf(setOf("none")) }
    var tools by remember { mutableStateOf(setOf("scissors", "hammer", "paint")) }
    var demographic by remember { mutableStateOf("adult") }
    var pincode by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }

    val userId = remember {
        val prefs = context.getSharedPreferences("tl_prefs", Context.MODE_PRIVATE)
        prefs.getString("user_id", null) ?: run {
            val id = "user_${UUID.randomUUID().toString().take(12)}"
            prefs.edit().putString("user_id", id).apply()
            id
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(listOf(Color(0x1F10B981), BgBase, BgBase))
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Spacer(Modifier.height(24.dp))

            // Logo
            Text(
                "🌿 TerraLoop",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Black,
                    brush = Brush.horizontalGradient(listOf(Emerald, Cyan))
                )
            )

            // Progress dots
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(5) { i ->
                    Box(
                        modifier = Modifier
                            .size(if (i == step) 24.dp else 10.dp, 10.dp)
                            .clip(CircleShape)
                            .background(if (i <= step) Emerald else GlassBorder)
                    )
                }
            }

            // Step content
            AnimatedContent(targetState = step, transitionSpec = {
                slideInHorizontally { it } togetherWith slideOutHorizontally { -it }
            }) { currentStep ->
                when (currentStep) {
                    0 -> StepHome(housing, greenSpace,
                        onHousingChange = { housing = it },
                        onGreenSpaceChange = { greenSpace = it })

                    1 -> StepInfrastructure(bins, compost, pickupDays,
                        onBinsChange = { bins = it },
                        onCompostChange = { compost = it },
                        onPickupChange = { pickupDays = it })

                    2 -> StepToolkit(tools, demographic,
                        onToolsChange = { tools = it },
                        onDemoChange = { demographic = it })

                    3 -> StepLocation(pincode, onPincodeChange = { pincode = it })

                    4 -> StepComplete()
                }
            }

            // Navigation buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (step > 0 && step < 4) {
                    OutlinedButton(
                        onClick = { step-- },
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(1.dp, GlassBorder),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary)
                    ) { Text("← Back") }
                }

                Button(
                    onClick = {
                        if (step < 3) {
                            step++
                        } else if (step == 3) {
                            isSaving = true
                            scope.launch {
                                try {
                                    val profile = UserProfile(
                                        userId = userId,
                                        housing = housing,
                                        greenSpace = greenSpace,
                                        bins = bins,
                                        compostAvailable = compost,
                                        pickupDays = pickupDays.toList(),
                                        tools = tools.toList(),
                                        demographic = demographic,
                                        pincode = pincode.ifBlank { "110001" }
                                    )
                                    ApiClient.service.saveProfile(userId, profile)
                                } catch (e: Exception) {
                                    // Non-fatal — proceed anyway
                                } finally {
                                    isSaving = false
                                    step = 4
                                }
                            }
                        } else {
                            onComplete()
                        }
                    },
                    enabled = !isSaving,
                    modifier = Modifier.weight(if (step > 0 && step < 4) 1.5f else 1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald, contentColor = BgVoid),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        when {
                            isSaving -> "Saving…"
                            step == 3 -> "Build My Profile →"
                            step == 4 -> "Launch TerraLoop 🚀"
                            else -> "Continue →"
                        },
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

// ── Step 0: Home ────────────────────────────────────────────────────────────
@Composable
fun StepHome(housing: String, greenSpace: String,
             onHousingChange: (String) -> Unit, onGreenSpaceChange: (String) -> Unit) {
    StepCard(title = "Your Living Space", subtitle = "Helps us filter suggestions to what fits your home.") {
        ChipSection("Housing Type",
            options = listOf("apartment" to "🏢 Apartment", "house" to "🏠 House", "condo" to "🏙️ Condo", "studio" to "🛏 Studio"),
            selected = setOf(housing),
            onSelect = { onHousingChange(it.first()) }
        )
        ChipSection("Green Space",
            options = listOf("none" to "🚫 None", "balcony" to "🪴 Balcony", "garden" to "🌿 Garden", "rooftop" to "🏗 Rooftop"),
            selected = setOf(greenSpace),
            onSelect = { onGreenSpaceChange(it.first()) }
        )
    }
}

// ── Step 1: Infrastructure ──────────────────────────────────────────────────
@Composable
fun StepInfrastructure(bins: Int, compost: Boolean, pickupDays: Set<String>,
                        onBinsChange: (Int) -> Unit, onCompostChange: (Boolean) -> Unit,
                        onPickupChange: (Set<String>) -> Unit) {
    StepCard(title = "Waste Infrastructure", subtitle = "Determines routing logic for every item you scan.") {
        Text("Bins", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedButton(onClick = { if (bins > 0) onBinsChange(bins - 1) }, shape = CircleShape,
                border = BorderStroke(1.dp, GlassBorder), colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary)) { Text("−") }
            Text("$bins", style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold, color = Emerald))
            OutlinedButton(onClick = { if (bins < 9) onBinsChange(bins + 1) }, shape = CircleShape,
                border = BorderStroke(1.dp, GlassBorder), colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary)) { Text("+") }
        }

        Text("Composting", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(true to "♻️ Yes, I compost", false to "❌ No composting").forEach { (val_, label) ->
                FilterChip(val_ == compost, onClick = { onCompostChange(val_) }, label = { Text(label, fontSize = 13.sp) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0x1A10B981), selectedLabelColor = Emerald))
            }
        }

        ChipSection("Pickup Days", isMulti = true,
            options = listOf("none" to "🚫 No service", "mon" to "Mon", "tue" to "Tue", "wed" to "Wed",
                "thu" to "Thu", "fri" to "Fri", "sat" to "Sat", "sun" to "Sun"),
            selected = pickupDays,
            onSelect = { selected ->
                if (selected.contains("none")) onPickupChange(setOf("none"))
                else onPickupChange(selected - "none")
            }
        )
    }
}

// ── Step 2: Toolkit ─────────────────────────────────────────────────────────
@Composable
fun StepToolkit(tools: Set<String>, demographic: String,
                onToolsChange: (Set<String>) -> Unit, onDemoChange: (String) -> Unit) {
    StepCard(title = "Your Toolkit", subtitle = "We'll only suggest projects you can actually make.") {
        ChipSection("Available Tools", isMulti = true,
            options = listOf("scissors" to "✂️ Scissors", "glue_gun" to "🔫 Glue Gun", "hammer" to "🔨 Hammer",
                "drill" to "🔩 Drill", "saw" to "🪚 Saw", "sewing" to "🧵 Sewing Kit",
                "paint" to "🖌️ Paint", "soldering" to "⚡ Soldering Iron"),
            selected = tools, onSelect = { onToolsChange(it) }
        )
        ChipSection("Household",
            options = listOf("adult" to "👤 Solo", "couple" to "👫 Couple", "family" to "👨‍👩‍👧 Family", "elderly" to "🧓 Elderly"),
            selected = setOf(demographic), onSelect = { onDemoChange(it.first()) }
        )
    }
}

// ── Step 3: Location ─────────────────────────────────────────────────────────
@Composable
fun StepLocation(pincode: String, onPincodeChange: (String) -> Unit) {
    StepCard(title = "Almost there — Your Area",
        subtitle = "We use your pincode only to check if certified waste facilities exist near you. We never store or share it.") {
        OutlinedTextField(
            value = pincode,
            onValueChange = { if (it.length <= 10) onPincodeChange(it) },
            label = { Text("Pincode / Postcode") },
            placeholder = { Text("e.g. 110001") },
            leadingIcon = { Text("📍") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Emerald, unfocusedBorderColor = GlassBorder,
                focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary,
                cursorColor = Emerald, focusedLabelColor = Emerald, unfocusedLabelColor = TextSecondary
            ),
            shape = RoundedCornerShape(12.dp)
        )
        Text("🔒 Used only for facility lookup. Never shared.",
            style = MaterialTheme.typography.bodySmall, color = TextMuted)
    }
}

// ── Step 4: Complete ─────────────────────────────────────────────────────────
@Composable
fun StepComplete() {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(Brush.radialGradient(listOf(Emerald, Cyan)))
        ) { Text("✓", style = MaterialTheme.typography.displaySmall.copy(color = Color.White, fontWeight = FontWeight.Bold)) }
        Text("All Set!", style = MaterialTheme.typography.headlineMedium.copy(
            fontWeight = FontWeight.Black,
            brush = Brush.horizontalGradient(listOf(Emerald, Cyan))
        ))
        Text("Your personalized waste intelligence profile is ready.",
            style = MaterialTheme.typography.bodyMedium, color = TextSecondary,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

// ── Shared Components ────────────────────────────────────────────────────────

@Composable
fun StepCard(title: String, subtitle: String, content: @Composable ColumnScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxWidth()) {
        Text(title, style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black))
        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0x0AFFFFFF))
                .border(1.dp, GlassBorder, RoundedCornerShape(18.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            content = content
        )
    }
}

@Composable
fun ChipSection(
    label: String,
    options: List<Pair<String, String>>,
    selected: Set<String>,
    isMulti: Boolean = false,
    onSelect: (Set<String>) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = TextSecondary)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, display) ->
                val isSelected = selected.contains(value)
                FilterChip(
                    selected = isSelected,
                    onClick = {
                        if (isMulti) {
                            val newSet = if (isSelected) selected - value else selected + value
                            onSelect(if (newSet.isEmpty()) selected else newSet)
                        } else {
                            onSelect(setOf(value))
                        }
                    },
                    label = { Text(display, fontSize = 13.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0x1A10B981),
                        selectedLabelColor = Emerald,
                        labelColor = TextSecondary
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true, selected = isSelected,
                        selectedBorderColor = Emerald, borderColor = GlassBorder
                    )
                )
            }
        }
    }
}
