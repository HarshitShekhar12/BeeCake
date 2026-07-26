const { createApp, ref, computed, onMounted, onUpdated, nextTick, watch } = Vue;

createApp({
    setup() {
        const menuItems = ref([]);
        const dietaryText = ref("100% Purely Veg");
        
        // Advanced State Management
        const currentView = ref('home');
        const showPaymentModal = ref(false);
        const showCareGuide = ref(false);
        const activeProduct = ref(null);
        const selectedWeight = ref(1);

        // Search & Category State
        const searchQuery = ref("");
        const selectedCategory = ref("All");

        // Occasions Data List
        const occasions = ref([
            { name: "Birthday Cakes", category: "Birthday", icon: "cake" },
            { name: "Wedding Cakes", category: "Wedding", icon: "crown" },
            { name: "Anniversary", category: "Anniversary", icon: "heart" },
            { name: "Celebration Cakes", category: "Celebration", icon: "party-popper" }
        ]);
        
        const isCartOpen = ref(false);
        const isCheckingOut = ref(false);
        const cart = ref([]);

        // Gallery State
        const galleryImages = ref([
            { src: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=500', title: 'Elegant Wedding Tier' },
            { src: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500', title: 'Jungle Safari Kids Theme' },
            { src: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=500', title: 'Pastel Floral Anniversary' },
            { src: 'https://images.unsplash.com/photo-1562777717-b6aff3ce3673?w=500', title: 'Loaded Chocolate Drip' }
        ]);
        
        const pincodeError = ref(false);
        const checkoutDetails = ref({
            method: 'delivery',
            name: "",
            phone: "",
            pincode: "",
            address: "",
            date: "",
            time: "10:00 AM - 1:00 PM",
            payMethod: "UPI",
            upiId: "vishakha.choudhary07@okicici"
        });

        // 🔒 BACKGROUND SCROLL LOCK LOGIC
        watch([isCartOpen, showPaymentModal, showCareGuide, activeProduct], () => {
            if (isCartOpen.value || showPaymentModal.value || showCareGuide.value || activeProduct.value !== null) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        const tomorrowDate = computed(() => {
            const today = new Date();
            today.setDate(today.getDate() + 1);
            return today.toISOString().split('T')[0];
        });

        const loadDatabase = () => {
            const data = window.bakeryDatabase;
            if (data && data.menu_items) {
                menuItems.value = data.menu_items.map(item => ({
                    id: item.id,
                    name: `${item.name} (${item.purely_veg ? 'Pure Veg 🌱' : ''})`,
                    price: item.price_per_pound,
                    desc: item.description,
                    image: item.image,
                    category: item.category || "General",
                    occasion: item.occasion || "Celebration",
                    isBestseller: item.is_bestseller || false
                }));
            }
        };

        const uniqueCategories = computed(() => {
            const categories = menuItems.value.map(item => item.category);
            const unique = new Set(categories);
            return ["All", ...Array.from(unique)];
        });

        const filterByOccasion = (occCategory) => {
            searchQuery.value = "";
            selectedCategory.value = occCategory;
            currentView.value = 'home';
            nextTick(() => {
                const menuEl = document.getElementById('menu');
                if (menuEl) {
                    menuEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        };

        const filteredMenuItems = computed(() => {
            return menuItems.value.filter(item => {
                const matchesCategory = selectedCategory.value === "All" || 
                                        item.category === selectedCategory.value || 
                                        item.occasion === selectedCategory.value;
                const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                                      item.desc.toLowerCase().includes(searchQuery.value.toLowerCase());
                return matchesCategory && matchesSearch;
            });
        });

        const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0));
        const cartTotal = computed(() => cart.value.reduce((total, item) => total + item.totalPrice, 0));

        const upiDeepLink = computed(() => {
            const payeeVpa = encodeURIComponent(checkoutDetails.value.upiId);
            const payeeName = encodeURIComponent("Bee Cake");
            const amount = cartTotal.value;
            const transactionNote = encodeURIComponent(`Order for ${checkoutDetails.value.name || 'Customer'}`);
            return `upi://pay?pa=${payeeVpa}&pn=${payeeName}&am=${amount}&cu=INR&tn=${transactionNote}`;
        });

        const openPDP = (item) => {
            activeProduct.value = item;
            selectedWeight.value = 1;
        };

        const closePDP = () => {
            activeProduct.value = null;
        };

        const addActiveProductToCart = () => {
            if (!activeProduct.value) return;
            const finalPrice = activeProduct.value.price * selectedWeight.value;
            cart.value.push({
                id: Date.now(),
                name: activeProduct.value.name,
                price: activeProduct.value.price,
                quantity: 1,
                totalPrice: finalPrice,
                isCustom: false,
                weight: selectedWeight.value
            });
            closePDP();
            isCartOpen.value = true;
        };

        const customCake = ref({ flavor: null, weight: 1.0, message: "" });
        const calculatedCustomPrice = computed(() => {
            if (!customCake.value.flavor) return 0;
            return Math.round(customCake.value.flavor.price * customCake.value.weight);
        });
        const addCustomCakeToCart = () => {
            if (!customCake.value.flavor) return;
            cart.value.push({
                id: Date.now(),
                name: `Custom ${customCake.value.flavor.name}`,
                price: calculatedCustomPrice.value,
                quantity: 1,
                totalPrice: calculatedCustomPrice.value,
                isCustom: true,
                weight: customCake.value.weight,
                message: customCake.value.message
            });
            customCake.value.weight = 1.0;
            customCake.value.message = "";
            isCartOpen.value = true;
        };

        const checkPincode = () => {
            if(checkoutDetails.value.pincode && checkoutDetails.value.pincode.trim().length !== 6) {
                pincodeError.value = true;
            } else {
                pincodeError.value = false;
            }
        };

        const openPaymentModal = () => {
            if (!checkoutDetails.value.name || !checkoutDetails.value.phone || !checkoutDetails.value.date) {
                alert("Please fill out your Name, Phone, and Delivery Date!");
                return;
            }
            showPaymentModal.value = true;
        };

        const confirmPaidOrder = () => {
            let orderSummary = `✨ *NEW ORDER - BEE CAKE* ✨\n\n`;
            orderSummary += `👤 *Name:* ${checkoutDetails.value.name}\n`;
            orderSummary += `📞 *Phone:* ${checkoutDetails.value.phone}\n`;
            orderSummary += `🗓️ *Date:* ${checkoutDetails.value.date} | ⏰ *Time:* ${checkoutDetails.value.time}\n`;
            
            if (checkoutDetails.value.method === 'delivery') {
                orderSummary += `🚚 *Type: Delivery*\n📍 *Address:* ${checkoutDetails.value.address} (${checkoutDetails.value.pincode})\n\n`;
            } else {
                orderSummary += `🏪 *Type: Store Pickup (Krishi Nagar)*\n\n`;
            }
            
            orderSummary += `🎂 *Order Details:* \n`;
            cart.value.forEach(item => {
                orderSummary += `• ${item.name} (${item.weight}lb) - ₹${item.totalPrice}\n`;
                if (item.isCustom && item.message) orderSummary += `  └ Msg: "${item.message}"\n`;
            });

            orderSummary += `\n💰 *Total Paid: ₹${cartTotal.value}*\n📌 *Note:* Please attach your payment screenshot!`;
            window.open(`https://api.whatsapp.com/send?phone=7752891455&text=${encodeURIComponent(orderSummary)}`, '_blank');
        };

        const closePaymentModal = () => {
            showPaymentModal.value = false;
            cart.value = [];
            isCheckingOut.value = false;
            isCartOpen.value = false;
        };

        const trackOrder = () => {
            const msg = "Hi Vishakha, could I please get a status update on my recent cake order?";
            window.open(`https://api.whatsapp.com/send?phone=7752891455&text=${encodeURIComponent(msg)}`, '_blank');
        };

        const removeFromCart = (index) => {
            cart.value.splice(index, 1);
            if (cart.value.length === 0) isCheckingOut.value = false;
        };

        onMounted(() => {
            loadDatabase();
            if (window.lucide) window.lucide.createIcons();
        });

        onUpdated(() => {
            if (window.lucide) window.lucide.createIcons();
        });

        return {
            menuItems, dietaryText, currentView, showCareGuide,
            activeProduct, selectedWeight, openPDP, closePDP, addActiveProductToCart,
            isCartOpen, isCheckingOut, cart, cartCount, cartTotal,
            customCake, calculatedCustomPrice, addCustomCakeToCart,
            checkoutDetails, pincodeError, checkPincode, tomorrowDate,
            showPaymentModal, upiDeepLink, openPaymentModal, confirmPaidOrder, closePaymentModal,
            trackOrder, removeFromCart, selectedCategory, uniqueCategories, filteredMenuItems,
            searchQuery, galleryImages, occasions, filterByOccasion
        };
    }
}).mount('#app');
