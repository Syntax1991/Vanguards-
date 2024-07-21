document.addEventListener('DOMContentLoaded', async () => {
    const raidLeaderSelect = document.getElementById('raidLeader');

    try {
        const response = await fetch('/api/raid-leaders');
        const raidLeaders = await response.json();

        raidLeaders.forEach(leader => {
            const option = document.createElement('option');
            option.value = leader.id;
            option.textContent = leader.username;
            raidLeaderSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching raid leaders:', error);
    }

    document.getElementById('createRaidForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);
        const data = {
            date: formData.get('date'),
            time: formData.get('time'),
            raidLeader: formData.get('raidLeader'),
            location: formData.get('location'),
            difficulty: formData.get('difficulty'),
            type: formData.get('type'),
        };

        try {
            const response = await fetch('/api/create-raid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Failed to create raid');
            }

            const result = await response.json();
            console.log('Raid created:', result);
            alert('Raid created successfully');
        } catch (error) {
            console.error('Error creating raid:', error);
            alert('Error creating raid');
        }
    });
});
