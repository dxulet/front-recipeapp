const API_KEY = "YOUR_API_KEY"; // Replace with your Spoonacular API key
const API_BASE_URL = "https://api.spoonacular.com/recipes";

// State management
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let debounceTimer;

// DOM Elements
const searchInput = document.querySelector(".search-input");
const suggestionsContainer = document.querySelector(".suggestions");
const recipesGrid = document.querySelector(".recipes-grid");
const loadingElement = document.querySelector(".loading");
const modal = document.querySelector(".modal");
const modalContent = document.querySelector(".modal-content");
const closeModal = document.querySelector(".close-modal");
const navLinks = document.querySelectorAll(".nav-link");

// Event Listeners
searchInput.addEventListener("input", handleSearch);
closeModal.addEventListener("click", () => (modal.style.display = "none"));
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});
navLinks.forEach((link) => link.addEventListener("click", navigate));

// Navigation Handler
function navigate(e) {
  e.preventDefault();
  const view = e.target.getAttribute("data-view");

  if (view === "home") {
    loadInitialRecipes();
  } else if (view === "favorites") {
    showFavorites();
  }

  navLinks.forEach((link) => link.classList.remove("active"));
  e.target.classList.add("active");
}

// Search Handler
function handleSearch(e) {
  const query = e.target.value.trim();

  if (query.length < 3) {
    suggestionsContainer.style.display = "none";
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchSuggestions(query);
  }, 300);
}

// API Calls
async function fetchSuggestions(query) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/autocomplete?apiKey=${API_KEY}&query=${query}&number=5`
    );
    const data = await response.json();
    displaySuggestions(data);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
  }
}

async function searchRecipes(query) {
  showLoading();
  try {
    const response = await fetch(
      `${API_BASE_URL}/complexSearch?apiKey=${API_KEY}&query=${query}&addRecipeInformation=true&number=12`
    );
    const data = await response.json();
    displayRecipes(data.results);
  } catch (error) {
    console.error("Error searching recipes:", error);
  } finally {
    hideLoading();
  }
}

async function getRecipeDetails(id) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/${id}/information?apiKey=${API_KEY}`
    );
    const data = await response.json();
    console.log(data);
    displayRecipeModal(data);
  } catch (error) {
    console.error("Error fetching recipe details:", error);
  }
}

// Display Functions
function displaySuggestions(suggestions) {
  suggestionsContainer.innerHTML = "";

  if (suggestions.length === 0) {
    suggestionsContainer.style.display = "none";
    return;
  }

  suggestions.forEach((suggestion) => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = suggestion.title;
    div.addEventListener("click", () => {
      searchInput.value = suggestion.title;
      suggestionsContainer.style.display = "none";
      searchRecipes(suggestion.title);
    });
    suggestionsContainer.appendChild(div);
  });

  suggestionsContainer.style.display = "block";
}

function displayRecipes(recipes) {
  recipesGrid.innerHTML = "";

  recipes.forEach((recipe) => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
            <img src="${recipe.image}" alt="${
      recipe.title
    }" class="recipe-image">
            <button class="favorite-btn ${
              favorites.includes(recipe.id) ? "active" : ""
            }" 
                    onclick="toggleFavorite(event, ${recipe.id})">
                <i class="fas fa-heart"></i>
            </button>
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.title}</h3>
                <div class="recipe-info">
                    <span><i class="far fa-clock"></i> ${
                      recipe.readyInMinutes
                    } mins</span>
                    <span><i class="fas fa-utensils"></i> ${
                      recipe.servings
                    } servings</span>
                </div>
            </div>
        `;

    card.addEventListener("click", (e) => {
      if (!e.target.closest(".favorite-btn")) {
        getRecipeDetails(recipe.id);
      }
    });

    recipesGrid.appendChild(card);
  });
}

// Fetch recipe nutrition details by recipe ID
async function getRecipeNutrition(id) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/${id}/nutritionWidget.json?apiKey=${API_KEY}`
    );
    const data = await response.json();

    // Extract calories, fat, and protein from the response
    const calories = data.nutrients.find(
      (nutrient) => nutrient.name === "Calories"
    ) || { amount: 0, unit: "kcal" };
    const fat = data.nutrients.find((nutrient) => nutrient.name === "Fat") || {
      amount: 0,
      unit: "g",
    };
    const protein = data.nutrients.find(
      (nutrient) => nutrient.name === "Protein"
    ) || { amount: 0, unit: "g" };

    // Update the UI with these values
    return {
      calories: `${Math.round(calories.amount)} ${calories.unit}`,
      fat: `${Math.round(fat.amount)} ${fat.unit}`,
      protein: `${Math.round(protein.amount)} ${protein.unit}`,
    };
  } catch (error) {
    console.error("Error fetching nutrition data:", error);
    return {
      calories: "N/A",
      fat: "N/A",
      protein: "N/A",
    };
  }
}

// Example: Integrate this data into the modal display function
async function displayRecipeModal(recipe) {
  const nutritionData = await getRecipeNutrition(recipe.id);

  const nutritionHtml = `
        <div class="nutrition-info">
            <div class="nutrition-item">
                <div class="nutrition-label">Calories</div>
                <div class="nutrition-value">${nutritionData.calories}</div>
            </div>
            <div class="nutrition-item">
                <div class="nutrition-label">Fat</div>
                <div class="nutrition-value">${nutritionData.fat}</div>
            </div>
            <div class="nutrition-item">
                <div class="nutrition-label">Protein</div>
                <div class="nutrition-value">${nutritionData.protein}</div>
            </div>
        </div>
    `;

  const ingredientsHtml = `
        <h3>Ingredients</h3>
        <ul class="ingredients-list">
            ${recipe.extendedIngredients
              .map((ingredient) => `<li>${ingredient.original}</li>`)
              .join("")}
        </ul>
        <h3>Instructions</h3>
        <ol class="instructions-list">
            ${
              recipe.analyzedInstructions[0]?.steps
                .map((step) => `<li>${step.step}</li>`)
                .join("") || "<li>No instructions available</li>"
            }
        </ol>
    `;

  const modalHtml = `
        <h2 class="recipe-title">${recipe.title}</h2>
        <div class="recipe-info">
            <span><i class="far fa-clock"></i> ${recipe.readyInMinutes} mins</span>
            <span><i class="fas fa-utensils"></i> ${recipe.servings} servings</span>
        </div>
        ${nutritionHtml}
        ${ingredientsHtml}
    `;

  document.querySelector(".recipe-details").innerHTML = modalHtml;
  modal.style.display = "flex";
}

// Utility Functions
function showLoading() {
  loadingElement.style.display = "flex";
  recipesGrid.style.display = "none";
}

function hideLoading() {
  loadingElement.style.display = "none";
  recipesGrid.style.display = "grid";
}

function toggleFavorite(event, recipeId) {
  event.stopPropagation();
  const button = event.currentTarget;

  if (favorites.includes(recipeId)) {
    favorites = favorites.filter((id) => id !== recipeId);
    button.classList.remove("active");
  } else {
    favorites.push(recipeId);
    button.classList.add("active");
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
}

// Initialize favorites view if URL has #favorites
window.addEventListener("hashchange", handleHashChange);
window.addEventListener("load", handleHashChange);

function handleHashChange() {
  if (window.location.hash === "#favorites") {
    showFavorites();
  }
}

async function showFavorites() {
  recipesGrid.innerHTML = "";

  if (favorites.length === 0) {
    recipesGrid.innerHTML =
      "<p class='empty-message'>No favorite recipes yet!</p>";
    return;
  }

  showLoading();
  try {
    const recipes = await Promise.all(
      favorites.map(async (id) => {
        const response = await fetch(
          `${API_BASE_URL}/${id}/information?apiKey=${API_KEY}`
        );
        return response.json();
      })
    );
    displayRecipes(recipes);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    recipesGrid.innerHTML =
      "<p class='error-message'>Error loading favorite recipes</p>";
  } finally {
    hideLoading();
  }
}

// Initial load - show some popular recipes
async function loadInitialRecipes() {
  showLoading();
  try {
    const response = await fetch(
      `${API_BASE_URL}/random?apiKey=${API_KEY}&number=12`
    );
    const data = await response.json();
    displayRecipes(data.recipes);
  } catch (error) {
    console.error("Error loading initial recipes:", error);
    recipesGrid.innerHTML = "<p>Error loading recipes</p>";
  } finally {
    hideLoading();
  }
}

// Load initial recipes when the page loads
window.addEventListener("load", () => {
  loadInitialRecipes();
});
