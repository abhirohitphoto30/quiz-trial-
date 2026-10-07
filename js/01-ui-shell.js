        // Global Databases & In-Memory Config
        // Global Databases & In-Memory Config
        function toggleMobileSidebar() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay) {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Auto close mobile sidebar when menu buttons are clicked
            document.querySelectorAll('.sidebar .menu-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sidebar = document.querySelector('.sidebar');
                    const overlay = document.getElementById('sidebar-overlay');
                    if (sidebar && sidebar.classList.contains('active')) {
                        sidebar.classList.remove('active');
                        overlay.classList.remove('active');
                    }
                });
            });
        });
