
        // Boot check: unlock if Story was already completed on this device
        if (localStorage.getItem('arcadeUnlocked') === 'true') {
          ['btn-arcade', 'btn-versus'].forEach(id => {
            const b = document.getElementById(id);
            b.disabled = false; b.style.color = '#00ffff'; b.style.borderColor = '#00ffff'; b.style.cursor = 'pointer'; b.style.opacity = '1';
          });
          document.getElementById('btn-arcade').textContent = 'ARCADE MODUS';
          document.getElementById('btn-versus').textContent = 'VERSUS MODUS';
        }
      