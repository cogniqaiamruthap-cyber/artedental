/*!
* Start Bootstrap - Agency v7.0.12 (https://startbootstrap.com/theme/agency)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-agency/blob/master/LICENSE)
*/
//
// Scripts
// 

window.addEventListener('DOMContentLoaded', event => {

    // Navbar shrink function
    var navbarShrink = function () {
        const navbarCollapsible = document.body.querySelector('#mainNav');
        if (!navbarCollapsible) {
            return;
        }
        if (window.scrollY === 0) {
            navbarCollapsible.classList.remove('navbar-shrink');
        } else {
            navbarCollapsible.classList.add('navbar-shrink');
        }

    };

    // Shrink the navbar 
    navbarShrink();

    // Shrink the navbar when page is scrolled
    document.addEventListener('scroll', navbarShrink);

    // Manual Scroll Highlighting (Alternative to ScrollSpy)
    const sections = document.querySelectorAll('section, header');
    const navLinks = document.querySelectorAll('#navbarResponsive .nav-link');

    const updateActiveNav = () => {
        let current = '';
        const offset = 150; // Larger offset for mobile/scrolling

        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const id = section.getAttribute('id');
            // If the top of the section is near the top of the viewport
            if (id && rect.top <= offset && rect.bottom >= offset) {
                current = id;
            }
        });

        // Force Home active when at the very top
        if (window.scrollY < 50) {
            current = 'home';
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href').substring(1);
            if (href === current) {
                link.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav(); // Initial call

    // Navbar Toggler
    const navbarToggler = document.body.querySelector('.navbar-toggler');

    // Smooth scroll for nav links and brand
    const scrollLinks = document.querySelectorAll('#navbarResponsive .nav-link, .navbar-brand');
    scrollLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    // Custom smooth scroll to account for fixed navbar
                    const offset = 70;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = targetElement.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });

                    // Collapse navbar on mobile
                    const bsCollapse = bootstrap.Collapse.getInstance(document.getElementById('navbarResponsive'));
                    if (bsCollapse) {
                        bsCollapse.hide();
                    } else if (navbarToggler && window.getComputedStyle(navbarToggler).display !== 'none') {
                        navbarToggler.click();
                    }
                }
            }
        });
    });

    // Enquiry Form Handling
    const enquiryForm = document.getElementById('enquiryForm');
    const formSuccessMessage = document.getElementById('formSuccessMessage');

    if (enquiryForm) {
        enquiryForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Collect form data (for potential future use)
            const formData = {
                name: document.getElementById('fullName').value,
                email: document.getElementById('emailAddr').value,
                phone: document.getElementById('phoneNum').value,
                treatment: document.getElementById('treatmentType').value,
                message: document.getElementById('message').value
            };

            console.log('Enquiry Received:', formData);

            // Hide form and show success message
            enquiryForm.classList.add('d-none');
            formSuccessMessage.classList.remove('d-none');

            // Reset form after a delay (if modal is closed and reopened)
            setTimeout(() => {
                const modalElement = document.getElementById('enquiryModal');
                modalElement.addEventListener('hidden.bs.modal', function () {
                    enquiryForm.reset();
                    enquiryForm.classList.remove('d-none');
                    formSuccessMessage.classList.add('d-none');
                }, { once: true });
            }, 500);
        });
    }

});
