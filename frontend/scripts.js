document.addEventListener('DOMContentLoaded', async () => {
    const raidLeaderSelect = document.getElementById('raidLeader');
    const raidList = document.getElementById('raidList');

    try {
        const [raidLeaderResponse, raidsResponse] = await Promise.all([
            fetch('/api/raid-leaders'),
            fetch('/api/raids')
        ]);
        
        const [raidLeaders, raids] = await Promise.all([
            raidLeaderResponse.json(),
            raidsResponse.json()
        ]);

        // Populate raid leader dropdown
        raidLeaders.forEach(leader => {
            const option = document.createElement('option');
            option.value = leader.id;
            option.textContent = leader.username;
            raidLeaderSelect.appendChild(option);
        });

        // Display existing raids
        raids.forEach(raid => {
            const raidElement = document.createElement('div');
            raidElement.classList.add('raid');

            raidElement.innerHTML = `
                <h3>Raid: ${raid.location} - ${raid.date}</h3>
                <p><strong>Time:</strong> ${raid.time}</p>
                <p><strong>Raid Leader:</strong> ${raid.raidLeader}</p>
                <p><strong>Difficulty:</strong> ${raid.difficulty}</p>
                <p><strong>Type:</strong> ${raid.type}</p>
                <p><strong>Participants:</strong> ${raid.participants.length}</p>
            `;

            raidList.appendChild(raidElement);
        });
    } catch (error) {
        console.error('Error fetching raid leaders or raids:', error);
    }
});

document.getElementById('createRaidForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/create-raid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const raid = await response.json();
            alert('Raid created successfully');
            // Reload the page to see the new raid
            location.reload();
        } else {
            const error = await response.json();
            alert('Error creating raid: ' + error.message);
        }
    } catch (error) {
        console.error('Error creating raid:', error);
    }
});
