document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select so options don't duplicate on re-fetch
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";


        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section with remove icon for each participant
        const participantsHTML = details.participants && details.participants.length
          ? `<ul class="participants-list">${details.participants.map(p => `<li><span class="participant-name">${p}</span><button class="remove-participant" title="Unregister" data-email="${p}">🗑️</button></li>`).join('')}</ul>`
          : '<p class="no-participants">No participants yet</p>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            ${participantsHTML}
          </div>
        `;

        // Attach delete handlers to remove-participant buttons
        // (use a small timeout to ensure the innerHTML is parsed in DOM)
        setTimeout(() => {
          const removeButtons = activityCard.querySelectorAll('.remove-participant');
          removeButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const email = btn.dataset.email;
              if (!confirm(`Unregister ${email} from ${name}?`)) return;

              try {
                const resp = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                const resJson = await resp.json();

                if (resp.ok) {
                  // update local details and UI
                  const idx = details.participants.indexOf(email);
                  if (idx > -1) details.participants.splice(idx, 1);

                  const li = btn.closest('li');
                  if (li) li.remove();

                  // If no participants remain, show placeholder
                  const participantsWrapper = activityCard.querySelector('.participants');
                  if (details.participants.length === 0 && participantsWrapper) {
                    participantsWrapper.innerHTML = '<strong>Participants:</strong><p class="no-participants">No participants yet</p>';
                  }

                  // update availability
                  const spotsLeftNew = details.max_participants - details.participants.length;
                  const availP = activityCard.querySelector('p.availability');
                  if (availP) availP.innerHTML = `<strong>Availability:</strong> ${spotsLeftNew} spots left`;

                  messageDiv.textContent = resJson.message || 'Participant removed';
                  messageDiv.className = 'success';
                } else {
                  messageDiv.textContent = resJson.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                }

                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              } catch (err) {
                messageDiv.textContent = 'Failed to communicate with server.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                console.error('Error removing participant:', err);
              }
            });
          });
        }, 0);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities to show the new participant immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
